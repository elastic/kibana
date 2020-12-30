/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'kibana/server';

let internalRepository: ISavedObjectsRepository;
export const setInternalRepository = (
  createInternalRepository: (extraTypes?: string[]) => ISavedObjectsRepository
) => {
  internalRepository = createInternalRepository();
};
export const getInternalRepository = () => internalRepository;
