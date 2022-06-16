/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { cspRule, cspRuleTemplate } from './mappings';
import { cspRuleMigrations, cspRuleTemplateMigrations } from './migrations';
import {
  ruleSchemaV830,
  ruleSchemaV840,
  ruleTemplateSchemaV830,
  ruleTemplateSchemaV840,
} from '../../common/schemas';

import {
  CSP_RULE_SAVED_OBJECT_TYPE,
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from '../../common/constants';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: CSP_RULE_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: true,
      visibleInManagement: true,
    },
    schemas: {
      '8.3.0': ruleSchemaV830,
      '8.4.0': ruleSchemaV840,
    },
    migrations: cspRuleMigrations,
    mappings: cspRule,
  });
  savedObjects.registerType({
    name: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: true,
      visibleInManagement: true,
    },
    schemas: {
      '8.3.0': ruleTemplateSchemaV830,
      '8.4.0': ruleTemplateSchemaV840,
    },
    migrations: cspRuleTemplateMigrations,
    mappings: cspRuleTemplate,
  });
}
