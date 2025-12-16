/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/server';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';

export const esqlRuleCreatorRole: Role = {
  name: 'esql_rule_creator',
  kibana: [
    {
      feature: {
        [STACK_ALERTS_FEATURE_ID]: ['all'],
      },
      spaces: ['*'],
    },
  ],
  elasticsearch: {
    cluster: [],
    indices: [],
  },
};
