/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, SavedObjectsCreateOptions } from 'kibana/server';

type AlertSavedObjectsCreateOptions = Omit<SavedObjectsCreateOptions, 'id' | 'overwrite'>;
type AlertSavedObjectsUpdateOptions = Omit<SavedObjectsCreateOptions, 'id' | 'overwrite'> &
  Pick<Required<SavedObjectsCreateOptions>, 'id' | 'overwrite'>;

export type SavedObjectsClientWithoutUpdates = Omit<
  SavedObjectsClientContract,
  'create' | 'update' | 'bulkUpdate'
> & {
  create<T = unknown>(
    type: string,
    attributes: T,
    options?: AlertSavedObjectsCreateOptions | AlertSavedObjectsUpdateOptions
  ): Promise<SavedObject<T>>;
};
