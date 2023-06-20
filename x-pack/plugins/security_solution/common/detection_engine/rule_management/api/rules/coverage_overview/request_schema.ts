/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export type MitreCoverageRuleAvailability = t.TypeOf<typeof MitreCoverageRuleAvailability>;
export const MitreCoverageRuleAvailability = t.union([
  t.literal('enabled'),
  t.literal('disabled'),
  t.literal('available'),
]);

export type MitreCoverageRuleOrigin = t.TypeOf<typeof MitreCoverageRuleOrigin>;
export const MitreCoverageRuleOrigin = t.union([
  t.literal('prebuilt'),
  t.literal('custom'),
  t.literal('customized'),
]);

export type MitreCoverageFilter = t.TypeOf<typeof MitreCoverageFilter>;
export const MitreCoverageFilter = t.partial({
  searchTerm: NonEmptyString,
  availability: MitreCoverageRuleAvailability,
  origin: MitreCoverageRuleOrigin,
});

export type MitreCoverageRequest = t.TypeOf<typeof MitreCoverageRequest>;
export const MitreCoverageRequest = t.partial({
  filter: MitreCoverageFilter,
});
