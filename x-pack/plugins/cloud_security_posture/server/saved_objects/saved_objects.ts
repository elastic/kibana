/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { cspRuleSavedObjectMapping, cspRuleTemplateSavedObjectMapping } from './mappings';
import { cspRuleMigrations, cspRuleTemplateMigrations } from './migrations';
import {
  cspRuleSchemaV830,
  cspRuleSchemaV840,
  cspRuleTemplateSchemaV830,
  cspRuleTemplateSchemaV840,
  CspRuleTemplate,
  CspRule,
  cspRuleTemplateSchemaV870,
} from '../../common/schemas';

import {
  CSP_RULE_SAVED_OBJECT_TYPE,
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from '../../common/constants';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType<CspRule>({
    name: CSP_RULE_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: true,
      visibleInManagement: true,
      getTitle: (savedObject) =>
        `${i18n.translate('xpack.csp.cspSettings.rules', {
          defaultMessage: `CSP Security Rules - `,
        })} ${savedObject.attributes.metadata.benchmark.name} ${
          savedObject.attributes.metadata.benchmark.version
        } ${savedObject.attributes.metadata.name}`,
    },
    schemas: {
      '8.3.0': cspRuleSchemaV830,
      '8.4.0': cspRuleSchemaV840,
    },
    migrations: cspRuleMigrations,
    mappings: cspRuleSavedObjectMapping,
  });
  savedObjects.registerType<CspRuleTemplate>({
    name: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
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
