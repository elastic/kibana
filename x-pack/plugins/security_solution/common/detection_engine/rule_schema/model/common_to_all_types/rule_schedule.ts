/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { from } from '@kbn/securitysolution-io-ts-alerting-types';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleInterval = t.TypeOf<typeof RuleInterval>;
export const RuleInterval = t.string; // should be non-empty more specific string

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleIntervalFrom = t.TypeOf<typeof RuleIntervalFrom>;
export const RuleIntervalFrom = from;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 * TODO: Create a regular expression type or custom date math part type here
 */
export type RuleIntervalTo = t.TypeOf<typeof RuleIntervalTo>;
export const RuleIntervalTo = t.string;
