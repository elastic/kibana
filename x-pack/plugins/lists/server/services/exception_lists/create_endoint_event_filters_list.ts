/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';
import { Version } from '@kbn/securitysolution-io-ts-types';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import {
  ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionList } from './utils';

interface CreateEndpointEventFiltersListOptions {
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
  tieBreaker?: string;
  version: Version;
}

/**
 * Creates the Endpoint Trusted Apps agnostic list if it does not yet exist
 *
 * @param savedObjectsClient
 * @param user
 * @param tieBreaker
 * @param version
 */
export const createEndpointEventFiltersList = async ({
  savedObjectsClient,
  user,
  tieBreaker,
  version,
}: CreateEndpointEventFiltersListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType: 'agnostic' });
  const dateNow = new Date().toISOString();
  try {
    const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(
      savedObjectType,
      {
        comments: undefined,
        created_at: dateNow,
        created_by: user,
        description: ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION,
        entries: undefined,
        immutable: false,
        item_id: undefined,
        list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
        list_type: 'list',
        meta: undefined,
        name: ENDPOINT_EVENT_FILTERS_LIST_NAME,
        os_types: [],
        tags: [],
        tie_breaker_id: tieBreaker ?? uuid.v4(),
        type: 'endpoint_events',
        updated_by: user,
        version,
      },
      {
        // We intentionally hard coding the id so that there can only be one Event Filters list within the space
        id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      }
    );

    return transformSavedObjectToExceptionList({ savedObject });
  } catch (err) {
    if (savedObjectsClient.errors.isConflictError(err)) {
      return null;
    } else {
      throw err;
    }
  }
};
