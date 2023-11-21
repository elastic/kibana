/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

export type GetRuleManagementFiltersResponse = t.TypeOf<typeof GetRuleManagementFiltersResponse>;
export const GetRuleManagementFiltersResponse = t.exact(
  t.type({
    rules_summary: t.type({
      custom_count: PositiveInteger,
      prebuilt_installed_count: PositiveInteger,
    }),
    aggregated_fields: t.type({
      tags: t.array(t.string),
    }),
  })
);
