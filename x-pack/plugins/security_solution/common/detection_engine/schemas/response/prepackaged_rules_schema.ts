/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { rules_installed, rules_updated } from '../common/schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const prePackagedRulesSchema = t.exact(
  t.type({
    rules_installed,
    rules_updated,
  })
);

export type PrePackagedRulesSchema = t.TypeOf<typeof prePackagedRulesSchema>;
