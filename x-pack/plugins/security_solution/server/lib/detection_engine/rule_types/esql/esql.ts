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

import { buildEsqlSearchRequest } from './build_esql_search_request';
import { performEsqlRequest } from './esql_request';
import { wrapGroupedEsqlAlerts } from './wrap_grouped_esql_alerts';
import { bulkCreateWithSuppression } from '../query/alert_suppression/bulk_create_with_suppression';

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

import { computeIfGrouping } from './utils';

export const esqlExecutor = async ({
  runOpts: {
    completeRule,
    tuple,
    runtimeMappings,
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

    const esqlRequest = buildEsqlSearchRequest({
      query: ruleParams.query,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      size: ruleParams.maxSignals,
      filters: ruleParams.filters,
      primaryTimestamp,
      secondaryTimestamp,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`ESQL query request: ${JSON.stringify(esqlRequest)}`);
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }

    const isGrouping = computeIfGrouping(completeRule.ruleParams.query);

    const esqlSignalSearchStart = performance.now();

    const response = await performEsqlRequest({
      esClient: services.scopedClusterClient.asCurrentUser,
      requestParams: esqlRequest,
    });

    const esqlSearchDuration = makeFloatString(performance.now() - esqlSignalSearchStart);
    result.searchAfterTimes = [esqlSearchDuration];

    const suppressionDuration = completeRule.ruleParams.esqlParams?.suppressionDuration;
    const suppressionFields = completeRule.ruleParams.esqlParams?.groupByFields ?? [];

    // if (isGrouping) {
    const wrappedAlerts = wrapGroupedEsqlAlerts({
      results: response,
      spaceId,
      completeRule,
      mergeStrategy,
      alertTimestampOverride,
      ruleExecutionLogger,
      publicBaseUrl,
      tuple,
      suppressionFields,
    });

    const suppressionWindow = suppressionDuration
      ? `now-${suppressionDuration.value}${suppressionDuration.unit}`
      : completeRule.ruleParams.from;

    const bulkCreateResult = await bulkCreateWithSuppression({
      alertWithSuppression,
      ruleExecutionLogger,
      wrappedDocs: wrappedAlerts,
      services,
      suppressionWindow,
      alertTimestampOverride,
    });
    addToSearchAfterReturn({ current: result, next: bulkCreateResult });
    ruleExecutionLogger.debug(`created ${bulkCreateResult.createdItemsCount} signals`);
    // } else {
    //   const wrappedAlerts = wrapEsqlAlerts({
    //     results: response,
    //     spaceId,
    //     completeRule,
    //     mergeStrategy,
    //     alertTimestampOverride,
    //     ruleExecutionLogger,
    //     publicBaseUrl,
    //     tuple,
    //   });

    //   if (wrappedAlerts?.length) {
    //     const createResult = await bulkCreate(
    //       wrappedAlerts,
    //       undefined,
    //       createEnrichEventsFunction({
    //         services,
    //         logger: ruleExecutionLogger,
    //       })
    //     );

    //     addToSearchAfterReturn({ current: result, next: createResult });
    //   }
    // }

    if (response.values.length > ruleParams.maxSignals) {
      result.warningMessages.push(getMaxSignalsWarning());
    }

    return { ...result, state };
  });
};
