/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';
import { SavedObject } from 'src/core/types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Logger } from 'src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { buildEqlSearchRequest } from '../../../../../common/detection_engine/get_query_filter';
import { hasLargeValueItem } from '../../../../../common/detection_engine/utils';
import { isOutdated } from '../../migrations/helpers';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { MIN_EQL_RULE_INDEX_VERSION } from '../../routes/index/get_signals_template';
import { EqlRuleParams } from '../../schemas/rule_schemas';
import { buildSignalFromEvent, buildSignalGroupFromSequence } from '../build_bulk_body';
import { getInputIndex } from '../get_input_output_index';
import { filterDuplicateSignals } from '../filter_duplicate_signals';
import {
  AlertAttributes,
  BulkCreate,
  EqlSignalSearchResponse,
  SearchAfterAndBulkCreateReturnType,
  WrappedSignalHit,
} from '../types';
import { createSearchAfterReturnType, makeFloatString, wrapSignal } from '../utils';

export const eqlExecutor = async ({
  rule,
  exceptionItems,
  services,
  version,
  logger,
  searchAfterSize,
  bulkCreate,
}: {
  rule: SavedObject<AlertAttributes<EqlRuleParams>>;
  exceptionItems: ExceptionListItemSchema[];
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  logger: Logger;
  searchAfterSize: number;
  bulkCreate: BulkCreate;
}): Promise<SearchAfterAndBulkCreateReturnType> => {
  const result = createSearchAfterReturnType();
  const ruleParams = rule.attributes.params;
  if (hasLargeValueItem(exceptionItems)) {
    result.warningMessages.push(
      'Exceptions that use "is in list" or "is not in list" operators are not applied to EQL rules'
    );
    result.warning = true;
  }
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
  const inputIndex = await getInputIndex(services, version, ruleParams.index);
  const request = buildEqlSearchRequest(
    ruleParams.query,
    inputIndex,
    ruleParams.from,
    ruleParams.to,
    searchAfterSize,
    ruleParams.timestampOverride,
    exceptionItems,
    ruleParams.eventCategoryOverride
  );
  const eqlSignalSearchStart = performance.now();
  logger.debug(
    `EQL query request path: ${request.path}, method: ${request.method}, body: ${JSON.stringify(
      request.body
    )}`
  );
  // TODO: fix this later
  const { body: response } = (await services.scopedClusterClient.asCurrentUser.transport.request(
    request
  )) as ApiResponse<EqlSignalSearchResponse>;
  const eqlSignalSearchEnd = performance.now();
  const eqlSearchDuration = makeFloatString(eqlSignalSearchEnd - eqlSignalSearchStart);
  result.searchAfterTimes = [eqlSearchDuration];
  let newSignals: WrappedSignalHit[] | undefined;
  if (response.hits.sequences !== undefined) {
    newSignals = response.hits.sequences.reduce(
      (acc: WrappedSignalHit[], sequence) =>
        acc.concat(buildSignalGroupFromSequence(sequence, rule, ruleParams.outputIndex)),
      []
    );
  } else if (response.hits.events !== undefined) {
    newSignals = filterDuplicateSignals(
      rule.id,
      response.hits.events.map((event) =>
        wrapSignal(buildSignalFromEvent(event, rule, true), ruleParams.outputIndex)
      )
    );
  } else {
    throw new Error(
      'eql query response should have either `sequences` or `events` but had neither'
    );
  }

  if (newSignals.length > 0) {
    const insertResult = await bulkCreate(newSignals);
    result.bulkCreateTimes.push(insertResult.bulkCreateDuration);
    result.createdSignalsCount += insertResult.createdItemsCount;
    result.createdSignals = insertResult.createdItems;
  }
  result.success = true;
  return result;
};
