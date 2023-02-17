/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { Version } from '@kbn/securitysolution-io-ts-types';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import {
  ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_NAME,
} from '@kbn/securitysolution-list-constants';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionList } from './utils';

interface CreateEndpointListOptions {
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
export const createEndpointTrustedAppsList = async ({
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
        description: ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION,
        entries: undefined,
        expire_time: undefined,
        immutable: false,
        item_id: undefined,
        list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
        list_type: 'list',
        meta: undefined,
        name: ENDPOINT_TRUSTED_APPS_LIST_NAME,
        os_types: [],
        tags: [],
        tie_breaker_id: tieBreaker ?? uuidv4(),
        type: 'endpoint',
        updated_by: user,
        version,
      },
      {
        // We intentionally hard coding the id so that there can only be one Trusted apps list within the space
        id: ENDPOINT_TRUSTED_APPS_LIST_ID,
      }
    );
    return transformSavedObjectToExceptionList({ savedObject });
  } catch (err) {
    if (SavedObjectsErrorHelpers.isConflictError(err)) {
      return null;
    } else {
      throw err;
    }
  }
};
