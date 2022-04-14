/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Logger } from 'src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '../../../../../../alerting/server';
import { buildEqlSearchRequest } from '../build_events_query';
import { hasLargeValueItem } from '../../../../../common/detection_engine/utils';
import { isOutdated } from '../../migrations/helpers';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { MIN_EQL_RULE_INDEX_VERSION } from '../../routes/index/get_signals_template';
import { getInputIndex } from '../get_input_output_index';

import {
  BulkCreate,
  WrapHits,
  WrapSequences,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from '../types';
import { createSearchAfterReturnType, makeFloatString } from '../utils';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildReasonMessageForEqlAlert } from '../reason_formatters';
import { CompleteRule, EqlRuleParams } from '../../schemas/rule_schemas';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../common/detection_engine/schemas/alerts';

export const eqlExecutor = async ({
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
    if (!experimentalFeatures.ruleRegistryEnabled) {
      try {
        const signalIndexVersion = await getIndexVersion(
          services.scopedClusterClient.asCurrentUser,
          ruleParams.outputIndex
        );
        if (isOutdated({ current: signalIndexVersion, target: MIN_EQL_RULE_INDEX_VERSION })) {
          throw new Error(
            `EQL based rules require an update to version ${MIN_EQL_RULE_INDEX_VERSION} of the detection alerts index mapping`
          );
        }
      } catch (err) {
        if (err.statusCode === 403) {
          throw new Error(
            `EQL based rules require the user that created it to have the view_index_metadata, read, and write permissions for index: ${ruleParams.outputIndex}`
          );
        } else {
          throw err;
        }
      }
    }
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index: ruleParams.index,
    });

    const request = buildEqlSearchRequest(
      ruleParams.query,
      inputIndex,
      tuple.from.toISOString(),
      tuple.to.toISOString(),
      completeRule.ruleParams.maxSignals,
      ruleParams.timestampOverride,
      exceptionItems,
      ruleParams.eventCategoryOverride
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
      result.totalHits = response.hits.sequences.length;
    } else if (response.hits.events !== undefined) {
      newSignals = wrapHits(response.hits.events, buildReasonMessageForEqlAlert);
      result.totalHits = response.hits.events.length;
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
