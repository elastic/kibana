/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const protectionUpdatesNoteSavedObjectType = 'policy-settings-protection-updates-note';

export const protectionUpdatesNoteSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    note: {
      type: 'text',
      index: false,
    },
  },
};

export const protectionUpdatesNoteType: SavedObjectsType = {
  name: protectionUpdatesNoteSavedObjectType,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'single',
  mappings: protectionUpdatesNoteSavedObjectMappings,
};
