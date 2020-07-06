/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import {
  rules_installed,
  rules_custom_installed,
  rules_not_installed,
  rules_not_updated,
} from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const prePackagedRulesStatusSchema = t.exact(
  t.type({
    rules_custom_installed,
    rules_installed,
    rules_not_installed,
    rules_not_updated,
  })
);

export type PrePackagedRulesStatusSchema = t.TypeOf<typeof prePackagedRulesStatusSchema>;
