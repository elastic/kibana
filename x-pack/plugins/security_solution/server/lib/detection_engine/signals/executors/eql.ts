/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { Logger } from '@kbn/core/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { buildEqlSearchRequest } from '../build_events_query';
import { hasLargeValueItem } from '../../../../../common/detection_engine/utils';

import type {
  BulkCreate,
  WrapHits,
  WrapSequences,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from '../types';
import { createSearchAfterReturnType, makeFloatString } from '../utils';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForEqlAlert } from '../reason_formatters';
import type { CompleteRule, EqlRuleParams } from '../../schemas/rule_schemas';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';

export const eqlExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  exceptionItems,
  experimentalFeatures,
  services,
  version,
  logger,
  bulkCreate,
  wrapHits,
  wrapSequences,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<EqlRuleParams>;
  tuple: RuleRangeTuple;
  exceptionItems: ExceptionListItemSchema[];
  experimentalFeatures: ExperimentalFeatures;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  logger: Logger;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
}): Promise<SearchAfterAndBulkCreateReturnType> => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('eqlExecutor', async () => {
    const result = createSearchAfterReturnType();
    if (hasLargeValueItem(exceptionItems)) {
      result.warningMessages.push(
        'Exceptions that use "is in list" or "is not in list" operators are not applied to EQL rules'
      );
      result.warning = true;
    }

    const request = buildEqlSearchRequest(
      ruleParams.query,
      inputIndex,
      tuple.from.toISOString(),
      tuple.to.toISOString(),
      completeRule.ruleParams.maxSignals,
      ruleParams.filters,
      ruleParams.timestampOverride,
      exceptionItems,
      runtimeMappings,
      ruleParams.eventCategoryOverride,
      ruleParams.timestampField,
      ruleParams.tiebreakerField
    );

    const eqlSignalSearchStart = performance.now();
    logger.debug(`EQL query request: ${JSON.stringify(request)}`);

    const response = await services.scopedClusterClient.asCurrentUser.eql.search<SignalSource>(
      request
    );

    const eqlSignalSearchEnd = performance.now();
    const eqlSearchDuration = makeFloatString(eqlSignalSearchEnd - eqlSignalSearchStart);
    result.searchAfterTimes = [eqlSearchDuration];

    let newSignals: Array<WrappedFieldsLatest<BaseFieldsLatest>> | undefined;
    if (response.hits.sequences !== undefined) {
      newSignals = wrapSequences(response.hits.sequences, buildReasonMessageForEqlAlert);
    } else if (response.hits.events !== undefined) {
      newSignals = wrapHits(response.hits.events, buildReasonMessageForEqlAlert);
    } else {
      throw new Error(
        'eql query response should have either `sequences` or `events` but had neither'
      );
    }

    if (newSignals?.length) {
      const insertResult = await bulkCreate(newSignals);
      result.bulkCreateTimes.push(insertResult.bulkCreateDuration);
      result.createdSignalsCount += insertResult.createdItemsCount;
      result.createdSignals = insertResult.createdItems;
    }

    result.success = true;
    return result;
  });
};
