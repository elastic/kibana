/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  rules_installed,
  rules_custom_installed,
  rules_not_installed,
  rules_not_updated,
  timelines_installed,
  timelines_not_installed,
  timelines_not_updated,
} from '../common/schemas';

export const prePackagedTimelinesStatusSchema = t.type({
  timelines_installed,
  timelines_not_installed,
  timelines_not_updated,
});

const prePackagedRulesStatusSchema = t.type({
  rules_custom_installed,
  rules_installed,
  rules_not_installed,
  rules_not_updated,
});

export const prePackagedRulesAndTimelinesStatusSchema = t.exact(
  t.intersection([prePackagedRulesStatusSchema, prePackagedTimelinesStatusSchema])
);

export type PrePackagedRulesAndTimelinesStatusSchema = t.TypeOf<
  typeof prePackagedRulesAndTimelinesStatusSchema
>;
