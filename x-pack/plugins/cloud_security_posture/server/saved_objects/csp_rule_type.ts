/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsType, SavedObjectsValidationMap } from '@kbn/core/server';
import { cspRuleAssetSavedObjectType } from '../../common/constants';
import { type CspRuleSchema, cspRuleSchema } from '../../common/schemas/csp_rule';

const validationMap: SavedObjectsValidationMap = {
  '1.0.0': cspRuleSchema,
};

export const ruleAssetSavedObjectMappings: SavedObjectsType<CspRuleSchema>['mappings'] = {
  dynamic: false,
  properties: {
    name: {
      type: 'text', // search
      fields: {
        // TODO: how is fields mapping shared with UI ?
        raw: {
          type: 'keyword', // sort
        },
      },
    },
    package_policy_id: {
      type: 'keyword',
    },
    policy_id: {
      type: 'keyword',
    },
    description: {
      type: 'text',
    },
    enabled: {
      type: 'boolean',
      fields: {
        keyword: {
          type: 'keyword', // sort
        },
      },
    },
  },
};

export const cspRuleAssetType: SavedObjectsType<CspRuleSchema> = {
  name: cspRuleAssetSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: ruleAssetSavedObjectMappings,
  schemas: validationMap,
  // migrations: {}
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
    getTitle: (savedObject) =>
      `${i18n.translate('xpack.csp.cspSettings.rules', {
        defaultMessage: `CSP Security Rules - `,
      })} ${savedObject.attributes.benchmark.name} ${savedObject.attributes.benchmark.version} ${
        savedObject.attributes.name
      }`,
  },
};
