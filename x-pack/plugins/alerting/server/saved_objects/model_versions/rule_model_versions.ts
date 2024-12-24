/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawRuleSchemaV1,
  rawRuleSchemaV2,
  rawRuleSchemaV3,
  rawRuleSchemaV4,
} from '../schemas/raw_rule';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawRuleSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawRuleSchemaV2,
    },
  },
  '3': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawRuleSchemaV3,
    },
  },
  '4': {
    changes: [],
    schemas: {
      forwardCompatibility: rawRuleSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: rawRuleSchemaV4,
    },
  },
};
