/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyArray } from '@kbn/securitysolution-io-ts-types';

export type MitreCoverageRuleData = t.TypeOf<typeof MitreCoverageRuleData>;
export const MitreCoverageRuleData = t.type({
  name: t.string,
  enabled: t.boolean,
});

export type MitreCoverageAvailableRuleData = t.TypeOf<typeof MitreCoverageAvailableRuleData>;
export const MitreCoverageAvailableRuleData = t.type({
  name: t.string,
  available: t.literal(true),
});

export type MitreCoverageResponse = t.TypeOf<typeof MitreCoverageResponse>;
export const MitreCoverageResponse = t.exact(
  t.type({
    coverage: t.record(t.string, NonEmptyArray(t.string)),
    rules_data: t.record(
      t.string,
      NonEmptyArray(t.union([MitreCoverageRuleData, MitreCoverageAvailableRuleData]))
    ),
  })
);
