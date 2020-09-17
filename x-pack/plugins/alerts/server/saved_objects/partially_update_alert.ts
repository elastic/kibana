/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { RawAlert } from '../types';

import {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateOptions,
} from '../../../../../src/core/server';

import { AlertAttributesExcludedFromAAD, AlertAttributesExcludedFromAADType } from './index';

export type PartiallyUpdateableAlertAttributes = Pick<RawAlert, AlertAttributesExcludedFromAADType>;

export interface PartiallyUpdateAlertSavedObjectOptions {
  version?: string;
  ignore404?: boolean;
  namespace?: string; // only should be used  with ISavedObjectsRepository
}

type SavedObjectClient = SavedObjectsClientContract | ISavedObjectsRepository;

// direct, partial update to an alert saved object via scoped SavedObjectsClient
// using namespace set in the client
export async function partiallyUpdateAlert(
  savedObjectsClient: SavedObjectClient,
  id: string,
  attributes: PartiallyUpdateableAlertAttributes,
  options: PartiallyUpdateAlertSavedObjectOptions = {}
): Promise<void> {
  // ensure we only have the valid attributes excluded from AAD
  const attributeUpdates = pick(attributes, AlertAttributesExcludedFromAAD);
  const updateOptions: SavedObjectsUpdateOptions = pick(options, 'namespace', 'version');

  try {
    await savedObjectsClient.update<RawAlert>('alert', id, attributeUpdates, updateOptions);
  } catch (err) {
    if (options?.ignore404 && SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return;
    }
    throw err;
  }
}
