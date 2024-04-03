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

import {
  computeIsESQLQueryAggregating,
  getIndexListFromEsqlQuery,
} from '@kbn/securitysolution-utils';
import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapEsqlAlerts } from './wrap_esql_alerts';
import { createEnrichEventsFunction } from '../utils/enrichments';
import { rowToDocument } from './utils';
import { fetchSourceDocuments } from './fetch_source_documents';

import type { RunOpts } from '../types';

import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
} from '../utils/utils';
import type { EsqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';

/**
 * ES|QL returns results as a single page. max size of 10,000
 * while we try increase size of the request to catch all events
 * we don't want to overload ES/Kibana with large responses
 */
const ESQL_PAGE_SIZE_CIRCUIT_BREAKER = 1000;

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
  },
  services,
  state,
  spaceId,
}: {
  runOpts: RunOpts<EsqlRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  state: object;
  spaceId: string;
  version: string;
}) => {
  const ruleParams = completeRule.ruleParams;

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

      const wrappedAlerts = wrapEsqlAlerts({
        sourceDocuments,
        isRuleAggregating,
        results,
        spaceId,
        completeRule,
        mergeStrategy,
        alertTimestampOverride,
        ruleExecutionLogger,
        publicBaseUrl,
        tuple,
      });

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
