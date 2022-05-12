/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { withApmSpan } from '../../utils/with_apm_span';

export type InternalSavedObjectsClient = Awaited<
  ReturnType<typeof getInternalSavedObjectsClient>
>;
export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return withApmSpan('get_internal_saved_objects_client', () =>
    core.getStartServices().then(async ([coreStart]) => {
      return coreStart.savedObjects.createInternalRepository();
    })
  );
}
