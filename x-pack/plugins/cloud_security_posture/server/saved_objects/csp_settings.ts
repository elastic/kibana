/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { cspSettingsSchema } from '../../common/types/rules/v4';
import { cspSettingsSavedObjectMapping } from './mappings';
import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '../../common/constants';

export const cspSettings: SavedObjectsType = {
  name: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'agnostic',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: cspSettingsSchema.extends({}, { unknowns: 'ignore' }),
        create: cspSettingsSchema,
      },
    },
  },
  schemas: {},
  mappings: cspSettingsSavedObjectMapping,
};
