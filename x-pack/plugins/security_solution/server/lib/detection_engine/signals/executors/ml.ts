/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from 'src/core/server';
import { SavedObject } from 'src/core/types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { ListClient } from '../../../../../../lists/server';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { ExceptionListItemSchema } from '../../../../../common/shared_imports';
import { SetupPlugins } from '../../../../plugin';
import { MachineLearningRuleParams } from '../../schemas/rule_schemas';
import { RefreshTypes } from '../../types';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { filterEventsAgainstList } from '../filters/filter_events_against_list';
import { findMlSignals } from '../find_ml_signals';
import { BuildRuleMessage } from '../rule_messages';
import { RuleStatusService } from '../rule_status_service';
import { AlertAttributes } from '../types';
import { createErrorsFromShard, createSearchAfterReturnType, mergeReturns } from '../utils';

export const mlExecutor = async ({
  rule,
  ml,
  listClient,
  exceptionItems,
  ruleStatusService,
  services,
  logger,
  refresh,
  buildRuleMessage,
}: {
  rule: SavedObject<AlertAttributes<MachineLearningRuleParams>>;
  ml: SetupPlugins['ml'];
  listClient: ListClient;
  exceptionItems: ExceptionListItemSchema[];
  ruleStatusService: RuleStatusService;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  refresh: RefreshTypes;
  buildRuleMessage: BuildRuleMessage;
}) => {
  const result = createSearchAfterReturnType();
  const ruleParams = rule.attributes.params;
  if (ml == null) {
    throw new Error('ML plugin unavailable during rule execution');
  }

  // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
  // currently unused by the jobsSummary function.
  const fakeRequest = {} as KibanaRequest;
  const summaryJobs = await ml
    .jobServiceProvider(fakeRequest, services.savedObjectsClient)
    .jobsSummary(ruleParams.machineLearningJobId);
  const jobSummaries = summaryJobs.filter((job) =>
    ruleParams.machineLearningJobId.includes(job.id)
  );

  if (
    jobSummaries.length < 1 ||
    jobSummaries.some((job) => !isJobStarted(job.jobState, job.datafeedState))
  ) {
    const errorMessage = buildRuleMessage(
      'Machine learning job(s) are not started:',
      ...jobSummaries.map((job) =>
        [
          `job id: "${job.id}"`,
          `job status: "${job.jobState}"`,
          `datafeed status: "${job.datafeedState}"`,
        ].join(', ')
      )
    );
    logger.warn(errorMessage);
    result.warning = true;
    await ruleStatusService.partialFailure(errorMessage);
  }

  const anomalyResults = await findMlSignals({
    ml,
    // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
    // currently unused by the mlAnomalySearch function.
    request: ({} as unknown) as KibanaRequest,
    savedObjectsClient: services.savedObjectsClient,
    jobIds: ruleParams.machineLearningJobId,
    anomalyThreshold: ruleParams.anomalyThreshold,
    from: ruleParams.from,
    to: ruleParams.to,
    exceptionItems,
  });

  const filteredAnomalyResults = await filterEventsAgainstList({
    listClient,
    exceptionsList: exceptionItems,
    logger,
    eventSearchResult: anomalyResults,
    buildRuleMessage,
  });

  const anomalyCount = filteredAnomalyResults.hits.hits.length;
  if (anomalyCount) {
    logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
  }
  const {
    success,
    errors,
    bulkCreateDuration,
    createdItemsCount,
    createdItems,
  } = await bulkCreateMlSignals({
    someResult: filteredAnomalyResults,
    ruleSO: rule,
    services,
    logger,
    id: rule.id,
    signalsIndex: ruleParams.outputIndex,
    refresh,
    buildRuleMessage,
  });
  // The legacy ES client does not define failures when it can be present on the structure, hence why I have the & { failures: [] }
  const shardFailures =
    (filteredAnomalyResults._shards as typeof filteredAnomalyResults._shards & {
      failures: [];
    }).failures ?? [];
  const searchErrors = createErrorsFromShard({
    errors: shardFailures,
  });
  return mergeReturns([
    result,
    createSearchAfterReturnType({
      success: success && filteredAnomalyResults._shards.failed === 0,
      errors: [...errors, ...searchErrors],
      createdSignalsCount: createdItemsCount,
      createdSignals: createdItems,
      bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
    }),
  ]);
};
