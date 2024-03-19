/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';

import { SloSettings } from '../domain/models';

export const SO_SLO_SETTINGS_TYPE = 'slo-settings';
export const sloSettingsObjectId = 'slo-settings-singleton';

export const sloSettings: SavedObjectsType = {
  name: SO_SLO_SETTINGS_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  modelVersions: {},
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    displayName: 'SLO Settings',
    importableAndExportable: false,
    getTitle(sloSavedObject: SavedObject<SloSettings>) {
      return `SLO Settings [id=${sloSavedObject.id}]`;
    },
  },
};
