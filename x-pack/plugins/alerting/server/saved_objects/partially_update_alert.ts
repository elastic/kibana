/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import {
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import { RawRule } from '../types';

import { AlertAttributesExcludedFromAAD, AlertAttributesExcludedFromAADType } from '.';

export type PartiallyUpdateableAlertAttributes = Partial<
  Pick<RawRule, AlertAttributesExcludedFromAADType>
>;

export interface PartiallyUpdateAlertSavedObjectOptions {
  refresh?: SavedObjectsUpdateOptions['refresh'];
  version?: string;
  ignore404?: boolean;
  namespace?: string; // only should be used  with ISavedObjectsRepository
}

// typed this way so we can send a SavedObjectClient or SavedObjectRepository
type SavedObjectClientForUpdate = Pick<SavedObjectsClient, 'update'>;

// direct, partial update to an alert saved object via scoped SavedObjectsClient
// using namespace set in the client
export async function partiallyUpdateAlert(
  savedObjectsClient: SavedObjectClientForUpdate,
  id: string,
  attributes: PartiallyUpdateableAlertAttributes,
  options: PartiallyUpdateAlertSavedObjectOptions = {}
): Promise<void> {
  // ensure we only have the valid attributes excluded from AAD
  const attributeUpdates = pick(attributes, AlertAttributesExcludedFromAAD);
  const updateOptions: SavedObjectsUpdateOptions<RawRule> = pick(
    options,
    'namespace',
    'version',
    'refresh'
  );

  try {
    await savedObjectsClient.update<RawRule>('alert', id, attributeUpdates, updateOptions);
  } catch (err) {
    if (options?.ignore404 && SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return;
    }
    throw err;
  }
}
