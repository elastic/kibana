/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  rules_installed,
  rules_updated,
  timelines_installed,
  timelines_updated,
} from '../common/schemas';

const prePackagedRulesSchema = t.type({
  rules_installed,
  rules_updated,
});

const prePackagedTimelinesSchema = t.type({
  timelines_installed,
  timelines_updated,
});

export const prePackagedRulesAndTimelinesSchema = t.exact(
  t.intersection([prePackagedRulesSchema, prePackagedTimelinesSchema])
);

export type PrePackagedRulesAndTimelinesSchema = t.TypeOf<
  typeof prePackagedRulesAndTimelinesSchema
>;
