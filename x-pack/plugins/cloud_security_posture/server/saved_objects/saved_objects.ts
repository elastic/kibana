/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { cspRuleTemplateSavedObjectMapping } from './mappings';
import { cspRuleTemplateMigrations } from './migrations';
import {
  cspRuleTemplateSchemaV830,
  cspRuleTemplateSchemaV840,
  cspRuleTemplateSchemaV870,
  CspRuleTemplate,
} from '../../common/schemas';

import { CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/constants';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType<CspRuleTemplate>({
    name: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: true,
      visibleInManagement: true,
    },
    schemas: {
      '8.3.0': cspRuleTemplateSchemaV830,
      '8.4.0': cspRuleTemplateSchemaV840,
      '8.7.0': cspRuleTemplateSchemaV870,
    },
    migrations: cspRuleTemplateMigrations,
    mappings: cspRuleTemplateSavedObjectMapping,
  });
}
