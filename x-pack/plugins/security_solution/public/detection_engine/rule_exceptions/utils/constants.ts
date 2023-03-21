/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

export const ruleTypesThatAllowLargeValueLists: Type[] = [
  'query',
  'machine_learning',
  'saved_query',
  'threat_match',
];
