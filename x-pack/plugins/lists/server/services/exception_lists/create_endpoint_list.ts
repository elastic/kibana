/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';

import {
  ENDPOINT_LIST_DESCRIPTION,
  ENDPOINT_LIST_ID,
  ENDPOINT_LIST_NAME,
} from '../../../common/constants';
import { ExceptionListSchema, ExceptionListSoSchema } from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectToExceptionList } from './utils';

interface CreateEndpointListOptions {
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
  tieBreaker?: string;
}

export const createEndpointList = async ({
  savedObjectsClient,
  user,
  tieBreaker,
}: CreateEndpointListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType: 'agnostic' });
  const dateNow = new Date().toISOString();
  try {
    const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(
      savedObjectType,
      {
        _tags: [],
        comments: undefined,
        created_at: dateNow,
        created_by: user,
        description: ENDPOINT_LIST_DESCRIPTION,
        entries: undefined,
        item_id: undefined,
        list_id: ENDPOINT_LIST_ID,
        list_type: 'list',
        meta: undefined,
        name: ENDPOINT_LIST_NAME,
        tags: [],
        tie_breaker_id: tieBreaker ?? uuid.v4(),
        type: 'endpoint',
        updated_by: user,
      },
      {
        // We intentionally hard coding the id so that there can only be one exception list within the space
        id: ENDPOINT_LIST_ID,
      }
    );
    return transformSavedObjectToExceptionList({ savedObject });
  } catch (err) {
    if (err.status === 409) {
      return null;
    } else {
      throw err;
    }
  }
};
