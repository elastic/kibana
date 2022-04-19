/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import uuid from 'uuid';
import { Version } from '@kbn/securitysolution-io-ts-types';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import {
  ENDPOINT_LIST_DESCRIPTION,
  ENDPOINT_LIST_ID,
  ENDPOINT_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionList } from './utils';

interface CreateEndpointListOptions {
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
  tieBreaker?: string;
  version: Version;
}

export const createEndpointList = async ({
  savedObjectsClient,
  user,
  tieBreaker,
  version,
}: CreateEndpointListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType: 'agnostic' });
  const dateNow = new Date().toISOString();
  try {
    const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(
      savedObjectType,
      {
        comments: undefined,
        created_at: dateNow,
        created_by: user,
        description: ENDPOINT_LIST_DESCRIPTION,
        entries: undefined,
        immutable: false,
        item_id: undefined,
        list_id: ENDPOINT_LIST_ID,
        list_type: 'list',
        meta: undefined,
        name: ENDPOINT_LIST_NAME,
        os_types: [],
        tags: [],
        tie_breaker_id: tieBreaker ?? uuid.v4(),
        type: 'endpoint',
        updated_by: user,
        version,
      },
      {
        // We intentionally hard coding the id so that there can only be one exception list within the space
        id: ENDPOINT_LIST_ID,
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
