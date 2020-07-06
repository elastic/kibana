/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart, ISavedObjectsRepository } from 'kibana/server';

let internalRepository: ISavedObjectsRepository | null = null;
export const setInternalRepository = (
  createInternalRepository: SavedObjectsServiceStart['createInternalRepository']
) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;
