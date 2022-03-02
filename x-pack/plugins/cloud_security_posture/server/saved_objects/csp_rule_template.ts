/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../src/core/server';
import {
  type CspRuleTemplateSchema,
  cspRuleTemplateSavedObjectType,
} from '../../common/schemas/csp_rule_template';

const ruleTemplateAssetSavedObjectMappings: SavedObjectsType<CspRuleTemplateSchema>['mappings'] = {
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
    description: {
      type: 'text',
    },
  },
};

export const cspRuleTemplateAssetType: SavedObjectsType<CspRuleTemplateSchema> = {
  name: cspRuleTemplateSavedObjectType,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
  mappings: ruleTemplateAssetSavedObjectMappings,
};
