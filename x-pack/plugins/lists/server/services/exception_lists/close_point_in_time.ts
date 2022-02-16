/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsClosePointInTimeResponse,
} from 'kibana/server';
import type { PitId } from '@kbn/securitysolution-io-ts-list-types';

interface ClosePointInTimeOptions {
  pit: PitId;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Closes a point in time (PIT) for either exception lists or exception list items.
 * See: https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
 * @params pit {string} The point in time to close
 * @params savedObjectsClient {object} The saved objects client to delegate to
 * @return {SavedObjectsOpenPointInTimeResponse} The point in time (PIT)
 */
export const closePointInTime = async ({
  pit,
  savedObjectsClient,
}: ClosePointInTimeOptions): Promise<SavedObjectsClosePointInTimeResponse> => {
  return savedObjectsClient.closePointInTime(pit);
};
