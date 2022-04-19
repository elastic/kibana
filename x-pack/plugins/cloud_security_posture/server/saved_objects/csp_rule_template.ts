/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import {
  type CloudSecurityPostureRuleTemplateSchema,
  cloudSecurityPostureRuleTemplateSavedObjectType,
} from '../../common/schemas/csp_rule_template';

const ruleTemplateAssetSavedObjectMappings: SavedObjectsType<CloudSecurityPostureRuleTemplateSchema>['mappings'] =
  {
    dynamic: false,
    properties: {},
  };

export const cspRuleTemplateAssetType: SavedObjectsType<CloudSecurityPostureRuleTemplateSchema> = {
  name: cloudSecurityPostureRuleTemplateSavedObjectType,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  namespaceType: 'agnostic',
  mappings: ruleTemplateAssetSavedObjectMappings,
};
