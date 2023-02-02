/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/server';

export type InternalSavedObjectsClient = Awaited<
  ReturnType<typeof getInternalSavedObjectsClient>
>;

export async function getInternalSavedObjectsClient(coreStart: CoreStart) {
  return coreStart.savedObjects.createInternalRepository();
}
