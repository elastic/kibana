/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import {
  computeIsESQLQueryAggregating,
  getIndexListFromEsqlQuery,
} from '@kbn/securitysolution-utils';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { wrapSuppressedEsqlAlerts } from './wrap_suppressed_esql_alerts';
import { bulkCreateSuppressedAlertsInMemory } from '../utils/bulk_create_suppressed_alerts_in_memory';
import { createEnrichEventsFunction } from '../utils/enrichments';
import { rowToDocument } from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';
import { buildReasonMessageForEsqlAlert } from '../utils/reason_formatters';

import type { RunOpts, SignalSource } from '../types';

import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import type { EsqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { getIsAlertSuppressionActive } from '../utils/get_is_alert_suppression_active';
import type { ExperimentalFeatures } from '../../../../../common';

export const esqlExecutor = async ({
  runOpts: {
    completeRule,
    tuple,
    ruleExecutionLogger,
    bulkCreate,
    mergeStrategy,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    unprocessedExceptions,
    alertTimestampOverride,
    publicBaseUrl,
    alertWithSuppression,
  },
  services,
  state,
  spaceId,
  experimentalFeatures,
  licensing,
}: {
  runOpts: RunOpts<EsqlRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  state: object;
  spaceId: string;
  version: string;
  experimentalFeatures: ExperimentalFeatures;
  licensing: LicensingPluginSetup;
}) => {
  const ruleParams = completeRule.ruleParams;
  /**
   * ES|QL returns results as a single page. max size of 10,000
   * while we try increase size of the request to catch all alerts that might been deduplicated
   * we don't want to overload ES/Kibana with large responses
   */
  const ESQL_PAGE_SIZE_CIRCUIT_BREAKER = tuple.maxSignals * 3;

  return withSecuritySpan('esqlExecutor', async () => {
    const result = createSearchAfterReturnType();
    let size = tuple.maxSignals;
    while (
      result.createdSignalsCount <= tuple.maxSignals &&
      size <= ESQL_PAGE_SIZE_CIRCUIT_BREAKER
    ) {
      const esqlRequest = buildEsqlSearchRequest({
        query: ruleParams.query,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        size,
        filters: [],
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
      });

      ruleExecutionLogger.debug(`ES|QL query request: ${JSON.stringify(esqlRequest)}`);
      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      const esqlSignalSearchStart = performance.now();

      const response = await performEsqlRequest({
        esClient: services.scopedClusterClient.asCurrentUser,
        requestParams: esqlRequest,
      });

      const esqlSearchDuration = makeFloatString(performance.now() - esqlSignalSearchStart);
      result.searchAfterTimes.push(esqlSearchDuration);

      ruleExecutionLogger.debug(`ES|QL query request took: ${esqlSearchDuration}ms`);

      const isRuleAggregating = computeIsESQLQueryAggregating(completeRule.ruleParams.query);

      const results = response.values
        // slicing already processed results in previous iterations
        .slice(size - tuple.maxSignals)
        .map((row) => rowToDocument(response.columns, row));

      const index = getIndexListFromEsqlQuery(completeRule.ruleParams.query);

      const sourceDocuments = await fetchSourceDocuments({
        esClient: services.scopedClusterClient.asCurrentUser,
        results,
        index,
        isRuleAggregating,
      });

      const isAlertSuppressionActive = await getIsAlertSuppressionActive({
        alertSuppression: completeRule.ruleParams.alertSuppression,
        licensing,
        isFeatureDisabled: !experimentalFeatures?.alertSuppressionForEsqlRuleEnabled,
      });

      const wrapHits = (events: Array<estypes.SearchHit<SignalSource>>) =>
        wrapEsqlAlerts({
          events,
          spaceId,
          completeRule,
          mergeStrategy,
          isRuleAggregating,
          alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl,
          tuple,
        });

      const syntheticHits: Array<estypes.SearchHit<SignalSource>> = results.map((document) => {
        const { _id, _version, _index, ...source } = document;

        return {
          _source: source as SignalSource,
          fields: _id ? sourceDocuments[_id]?.fields : {},
          _id: _id ?? '',
          _index: _index ?? '',
        };
      });

      if (isAlertSuppressionActive) {
        const wrapSuppressedHits = (events: Array<estypes.SearchHit<SignalSource>>) =>
          wrapSuppressedEsqlAlerts({
            events,
            spaceId,
            completeRule,
            mergeStrategy,
            isRuleAggregating,
            alertTimestampOverride,
            ruleExecutionLogger,
            publicBaseUrl,
            primaryTimestamp,
            secondaryTimestamp,
            tuple,
          });

        const bulkCreateResult = await bulkCreateSuppressedAlertsInMemory({
          enrichedEvents: syntheticHits,
          toReturn: result,
          wrapHits,
          bulkCreate,
          services,
          ruleExecutionLogger,
          tuple,
          alertSuppression: completeRule.ruleParams.alertSuppression,
          wrapSuppressedHits,
          alertTimestampOverride,
          alertWithSuppression,
          experimentalFeatures,
          buildReasonMessage: buildReasonMessageForEsqlAlert,
          mergeSourceAndFields: true,
          // passing 1 here since ES|QL does not support pagination
          maxNumberOfAlertsMultiplier: 1,
        });

        addToSearchAfterReturn({ current: result, next: bulkCreateResult });
        ruleExecutionLogger.debug(
          `Created ${bulkCreateResult.createdItemsCount} alerts. Suppressed ${bulkCreateResult.suppressedItemsCount} alerts`
        );

        if (bulkCreateResult.alertsWereTruncated) {
          result.warningMessages.push(getSuppressionMaxSignalsWarning());
          break;
        }
      } else {
        const wrappedAlerts = wrapHits(syntheticHits);

        const enrichAlerts = createEnrichEventsFunction({
          services,
          logger: ruleExecutionLogger,
        });
        const bulkCreateResult = await bulkCreate(
          wrappedAlerts,
          tuple.maxSignals - result.createdSignalsCount,
          enrichAlerts
        );

        addToSearchAfterReturn({ current: result, next: bulkCreateResult });
        ruleExecutionLogger.debug(`Created ${bulkCreateResult.createdItemsCount} alerts`);

        if (bulkCreateResult.alertsWereTruncated) {
          result.warningMessages.push(getMaxSignalsWarning());
          break;
        }
      }

      // no more results will be found
      if (response.values.length < size) {
        ruleExecutionLogger.debug(
          `End of search: Found ${response.values.length} results with page size ${size}`
        );
        break;
      }
      // ES|QL does not support pagination so we need to increase size of response to be able to catch all events
      size += tuple.maxSignals;
    }

    return { ...result, state };
  });
};
