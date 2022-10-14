/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { action, actions, throttle } from '@kbn/securitysolution-io-ts-alerting-types';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleAction = t.TypeOf<typeof RuleAction>;
export const RuleAction = action;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleActionArray = t.TypeOf<typeof RuleActionArray>;
export const RuleActionArray = actions;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleActionThrottle = t.TypeOf<typeof RuleActionThrottle>;
export const RuleActionThrottle = throttle;
