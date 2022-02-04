/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '../../../../../../src/core/server';
import type { CasesSavedObject } from './types';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../../cases/common/constants';

export interface GetCasesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  maxSize: number;
  maxPerPage: number;
}

export const getCases = async ({
  savedObjectsClient,
  maxSize,
  maxPerPage,
}: GetCasesOptions): Promise<Array<SavedObjectsFindResult<CasesSavedObject>>> => {
  const finder = savedObjectsClient.createPointInTimeFinder<CasesSavedObject>({
    type: CASE_COMMENT_SAVED_OBJECT,
    perPage: maxPerPage,
    namespaces: ['*'],
    filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: alert`,
  });
  let responses: Array<SavedObjectsFindResult<CasesSavedObject>> = [];
  for await (const response of finder.find()) {
    const extra = responses.length + response.saved_objects.length - maxSize;
    if (extra > 0) {
      responses = [...responses, ...response.saved_objects.splice(extra)];
    } else {
      responses = [...responses, ...response.saved_objects];
    }
  }
  return responses;
};
