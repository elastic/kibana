/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectsType } from '@kbn/core/server';
import { rulesV1, rulesV2, rulesV3 } from '../../common/types';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../common/constants';
import { cspBenchmarkRuleMigrations } from './migrations';
import { cspBenchmarkRuleSavedObjectMapping } from './mappings';

export const cspBenchmarkRule: SavedObjectsType = {
  name: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  schemas: {
    '8.3.0': rulesV1.cspBenchmarkRuleSchema,
    '8.4.0': rulesV2.cspBenchmarkRuleSchema,
    '8.7.0': rulesV3.cspBenchmarkRuleSchema,
  },
  migrations: cspBenchmarkRuleMigrations,
  mappings: cspBenchmarkRuleSavedObjectMapping,
};
