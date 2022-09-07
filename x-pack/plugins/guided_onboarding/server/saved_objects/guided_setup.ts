/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

export const guidedSetupSavedObjectsType = 'guided-setup-state';
export const guidedSetupSavedObjectsId = 'guided-setup-state-id';
export const guidedSetupDefaultState = {
  active_guide: undefined,
  active_step: undefined,
};
export const guidedSetupSavedObjects: SavedObjectsType = {
  name: guidedSetupSavedObjectsType,
  hidden: false,
  // make it available in all spaces for now
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      active_guide: {
        type: 'keyword',
      },
      active_step: {
        type: 'integer',
      },
    },
  },
};
