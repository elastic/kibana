/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getFilter } from '../get_filter';
import { BucketHistory, groupAndBulkCreate } from '../alert_grouping/group_and_bulk_create';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import type { RuleRangeTuple, BulkCreate, WrapHits } from '../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type {
  CompleteRule,
  SavedQueryRuleParams,
  QueryRuleParams,
} from '../../schemas/rule_schemas';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForQueryAlert } from '../reason_formatters';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { ConfigType } from '../../../../config';

export const queryExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  exceptionItems,
  listClient,
  experimentalFeatures,
  ruleExecutionLogger,
  eventsTelemetry,
  services,
  version,
  searchAfterSize,
  bulkCreate,
  wrapHits,
  primaryTimestamp,
  secondaryTimestamp,
  aggregatableTimestampField,
  spaceId,
  mergeStrategy,
  bucketHistory,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<QueryRuleParams> | CompleteRule<SavedQueryRuleParams>;
  tuple: RuleRangeTuple;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  experimentalFeatures: ExperimentalFeatures;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  searchAfterSize: number;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  aggregatableTimestampField: string;
  spaceId: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  bucketHistory?: BucketHistory[];
}) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('queryExecutor', async () => {
    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: inputIndex,
      lists: exceptionItems,
    });

    const searchParams = {
      tuple,
      completeRule,
      services,
      listClient,
      exceptionsList: exceptionItems,
      ruleExecutionLogger,
      eventsTelemetry,
      inputIndexPattern: inputIndex,
      pageSize: searchAfterSize,
      filter: esFilter,
      buildReasonMessage: buildReasonMessageForQueryAlert,
      bulkCreate,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
      aggregatableTimestampField,
      spaceId,
      mergeStrategy,
      bucketHistory,
    };

    if (experimentalFeatures.alertGroupingEnabled) {
      return groupAndBulkCreate(searchParams);
    } else {
      return searchAfterAndBulkCreate(searchParams);
    }
  });
};
