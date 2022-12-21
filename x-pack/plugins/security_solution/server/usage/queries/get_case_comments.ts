/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  Logger,
  SavedObjectsCreatePointInTimeFinderOptions,
} from '@kbn/core/server';

import { CASE_COMMENT_SAVED_OBJECT } from '@kbn/cases-plugin/common/constants';
import type { CommentAttributes } from '@kbn/cases-plugin/common/api/cases/comment';

export interface GetCasesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  maxSize: number;
  maxPerPage: number;
  logger: Logger;
}

export const getCaseComments = async ({
  savedObjectsClient,
  maxSize,
  maxPerPage,
  logger,
}: GetCasesOptions): Promise<Array<SavedObjectsFindResult<CommentAttributes>>> => {
  const query: SavedObjectsCreatePointInTimeFinderOptions = {
    type: CASE_COMMENT_SAVED_OBJECT,
    perPage: maxPerPage,
    namespaces: ['*'],
    filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: alert`,
  };
  logger.debug(`Getting cases with point in time (PIT) query:', ${JSON.stringify(query)}`);
  const finder = savedObjectsClient.createPointInTimeFinder<CommentAttributes>(query);
  let responses: Array<SavedObjectsFindResult<CommentAttributes>> = [];
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
