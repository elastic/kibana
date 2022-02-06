/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  SavedObjectsType,
  SavedObjectsValidationMap,
} from '../../../../../../src/core/server';
import { type CspConfigSchema, cspConfigSchema } from '../../../common/schemas/csp_configuration';

const configValidationMap: SavedObjectsValidationMap = {
  '1.0.0': cspConfigSchema,
};

export const configAssetSavedObjectMappings: SavedObjectsType<CspConfigSchema>['mappings'] = {
  dynamic: false,
  properties: {
    name: {
      type: 'text', // search
      fields: {
        raw: {
          type: 'keyword', // sort
        },
      },
    },
    description: {
      type: 'text',
    },
  },
};

export const cspConfigurationAssetType: SavedObjectsType<CspConfigSchema> = {
  name: 'csp_config',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: configAssetSavedObjectMappings,
  schemas: configValidationMap,
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
    // getTitle: (savedObject) =>
    //   i18n.translate('xpack.csp.cspSettings.rules', {
    // defaultMessage: `CSP Config }`,
    //   }),
  },
};
