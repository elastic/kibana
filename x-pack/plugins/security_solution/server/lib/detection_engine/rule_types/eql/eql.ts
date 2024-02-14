/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { firstValueFrom } from 'rxjs';
import { performance } from 'perf_hooks';
import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import type { ExperimentalFeatures } from '../../../../../common';
import { buildEqlSearchRequest } from './build_eql_search_request';
import { createEnrichEventsFunction } from '../utils/enrichments';

import type {
  BulkCreate,
  WrapHits,
  WrapSequences,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  WrapSuppressedHits,
} from '../types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
} from '../utils/utils';
import { buildReasonMessageForEqlAlert } from '../utils/reason_formatters';
import type { CompleteRule, EqlRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { bulkCreateSuppressedAlerts } from '../utils/bulk_create_suppressed_alerts';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';

interface EqlExecutorParams {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<EqlRuleParams>;
  tuple: RuleRangeTuple;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  experimentalFeatures?: ExperimentalFeatures;
}

export const eqlExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  ruleExecutionLogger,
  services,
  version,
  bulkCreate,
  wrapHits,
  wrapSequences,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  wrapSuppressedHits,
  licensing,
  experimentalFeatures,
  alertTimestampOverride,
  alertWithSuppression,
}: EqlExecutorParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('eqlExecutor', async () => {
    const result = createSearchAfterReturnType();

    const request = buildEqlSearchRequest({
      query: ruleParams.query,
      index: inputIndex,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: ruleParams.filters,
      primaryTimestamp,
      secondaryTimestamp,
      runtimeMappings,
      eventCategoryOverride: ruleParams.eventCategoryOverride,
      timestampField: ruleParams.timestampField,
      tiebreakerField: ruleParams.tiebreakerField,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`EQL query request: ${JSON.stringify(request)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }
    const eqlSignalSearchStart = performance.now();

    const response = await services.scopedClusterClient.asCurrentUser.eql.search<SignalSource>(
      request
    );

    const eqlSignalSearchEnd = performance.now();
    const eqlSearchDuration = makeFloatString(eqlSignalSearchEnd - eqlSignalSearchStart);
    result.searchAfterTimes = [eqlSearchDuration];

    let createResult;
    /**
     * Suppression, TODO see how to extract the duplicate code
     */
    // const newSignalsLength = newSignals?.length;
    // console.log(newSignalsLength);
    if (response.hits.events?.length) {
      const alertSuppression = completeRule.ruleParams.alertSuppression;
      const enabled = await isSuppressionEnabled(licensing, experimentalFeatures, alertSuppression);

      // Take the last element as it is the Shell Alert, TBC?
      // const enrichedEvents =
      //   sequenceHits !== undefined ? [newSignals[newSignalsLength - 1]] : newSignals;

      if (enabled) {
        createResult = await bulkCreateSuppressedAlerts({
          enrichedEvents: response.hits.events,
          toReturn: result,
          wrapHits,
          bulkCreate,
          services,
          buildReasonMessage: buildReasonMessageForEqlAlert,
          ruleExecutionLogger,
          tuple,
          alertSuppression,
          wrapSuppressedHits,
          alertTimestampOverride,
          alertWithSuppression,
        });
      } else {
        const sequenceHits = response.hits.sequences;
        let newSignals: Array<WrappedFieldsLatest<BaseFieldsLatest>> | undefined;
        if (sequenceHits !== undefined) {
          newSignals = wrapSequences(sequenceHits, buildReasonMessageForEqlAlert);
        } else if (response.hits.events !== undefined) {
          newSignals = wrapHits(response.hits.events, buildReasonMessageForEqlAlert);
        } else {
          throw new Error(
            'eql query response should have either `sequences` or `events` but had neither'
          );
        }
        createResult = await bulkCreate(
          newSignals,
          undefined,
          createEnrichEventsFunction({
            services,
            logger: ruleExecutionLogger,
          })
        );
      }
      addToSearchAfterReturn({ current: result, next: createResult });
    }
    if (response.hits.total && response.hits.total.value >= ruleParams.maxSignals) {
      result.warningMessages.push(getMaxSignalsWarning());
    }
    return result;
  });
};

const isSuppressionEnabled = async (
  licensing: LicensingPluginSetup,
  experimentalFeatures?: ExperimentalFeatures,
  alertSuppression?: AlertSuppressionCamel
): Promise<boolean> => {
  const isAlertSuppressionEnabled = Boolean(alertSuppression?.groupBy?.length);
  if (!isAlertSuppressionEnabled) return false;

  const license = await firstValueFrom(licensing.license$);
  const hasPlatinumLicense = license.hasAtLeast('platinum');

  return !!(
    isAlertSuppressionEnabled &&
    experimentalFeatures?.alertSuppressionForEqlRuleEnabled &&
    hasPlatinumLicense
  );
};
