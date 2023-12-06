/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { cspRuleSavedObjectMapping } from './mappings';
import { cspRuleMigrations } from './migrations';

import { rulesV1, rulesV2, rulesV3 } from '@kbn/cloud-security-posture-plugin/common/types/';
import { CspRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';

import { CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/constants';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType<CspRule>({
    name: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: true,
      visibleInManagement: true,
    },
    schemas: {
      '8.3.0': rulesV1.cspRuleSchema,
      '8.4.0': rulesV2.cspRuleSchema,
      '8.7.0': rulesV3.cspRuleSchema,
    },
    migrations: cspRuleMigrations,
    mappings: cspRuleSavedObjectMapping,
  });
}
