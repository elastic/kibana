/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'src/core/server';

import { tagType } from './tag';
import { TaggingSavedObjectsClientWrapper } from './tagging_saved_objects_client_wrapper';

interface SetupSavedObjectsParams {
  savedObjects: CoreSetup['savedObjects'];
}

export function setupSavedObjects({ savedObjects }: SetupSavedObjectsParams) {
  savedObjects.registerType(tagType);

  savedObjects.addClientWrapper(
    Number.MAX_SAFE_INTEGER - 1,
    'savedObjectsTagging',
    ({ client: baseClient }) =>
      new TaggingSavedObjectsClientWrapper({
        baseClient,
      })
  );
}
