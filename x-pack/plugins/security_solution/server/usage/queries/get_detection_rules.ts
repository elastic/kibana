/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import {
  SIGNALS_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type { RuleSearchResult } from '../types';

export interface GetDetectionRulesOptions {
  maxSize: number;
  maxPerPage: number;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export const getDetectionRules = async ({
  maxSize,
  maxPerPage,
  logger,
  savedObjectsClient,
}: GetDetectionRulesOptions): Promise<Array<SavedObjectsFindResult<RuleSearchResult>>> => {
  const filterAttribute = 'alert.attributes.alertTypeId';
  const filter = [
    `${filterAttribute}: ${SIGNALS_ID}`,
    `${filterAttribute}: ${EQL_RULE_TYPE_ID}`,
    `${filterAttribute}: ${ML_RULE_TYPE_ID}`,
    `${filterAttribute}: ${QUERY_RULE_TYPE_ID}`,
    `${filterAttribute}: ${SAVED_QUERY_RULE_TYPE_ID}`,
    `${filterAttribute}: ${THRESHOLD_RULE_TYPE_ID}`,
    `${filterAttribute}: ${INDICATOR_RULE_TYPE_ID}`,
  ].join(' OR ');

  const query: SavedObjectsCreatePointInTimeFinderOptions = {
    type: 'alert',
    perPage: maxPerPage,
    namespaces: ['*'],
    filter,
  };
  logger.debug(
    `Getting detection rules with point in time (PIT) query:', ${JSON.stringify(query)}`
  );
  const finder = savedObjectsClient.createPointInTimeFinder<RuleSearchResult>(query);
  let responses: Array<SavedObjectsFindResult<RuleSearchResult>> = [];
  for await (const response of finder.find()) {
    const extra = responses.length + response.saved_objects.length - maxSize;
    if (extra > 0) {
      responses = [
        ...responses,
        ...response.saved_objects.slice(-response.saved_objects.length, -extra),
      ];
    } else {
      responses = [...responses, ...response.saved_objects];
    }
  }

  try {
    finder.close();
  } catch (exception) {
    // This is just a pre-caution in case the finder does a throw we don't want to blow up
    // the response. We have seen this within e2e test containers but nothing happen in normal
    // operational conditions which is why this try/catch is here.
  }

  logger.debug(`Returning cases response of length: "${responses.length}"`);
  return responses;
};
