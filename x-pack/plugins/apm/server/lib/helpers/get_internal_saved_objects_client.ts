/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup } from 'src/core/server';
import { PromiseReturnType } from '../../../../observability/typings/common';

export type InternalSavedObjectsClient = PromiseReturnType<
  typeof getInternalSavedObjectsClient
>;
export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    return coreStart.savedObjects.createInternalRepository();
  });
}
