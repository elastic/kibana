/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { kibanaPermissions } from '@kbn/agent-builder-sml-plugin/server';
import {
  SML_TEST_GATED_KI_TYPE,
  SML_TEST_ORIGIN_ID,
  SML_TEST_PUBLIC_KI_TYPE,
  SML_TEST_SEARCH_TOKEN,
  SML_TEST_SPACE_ID,
} from '../common/constants';

/**
 * Fixed so the crawler's change detection settles after the first pass instead of rewriting the
 * entry on every run.
 */
const FIXED_UPDATED_AT = '2024-01-01T00:00:00.000Z';

const createFixtureSmlType = (kiType: string, gated: boolean): SmlTypeDefinition => ({
  id: kiType,
  // Short enough that `run_soon` is a convenience rather than a requirement.
  fetchFrequency: () => '1m',

  async *list() {
    yield [{ id: SML_TEST_ORIGIN_ID, updatedAt: FIXED_UPDATED_AT, spaces: [SML_TEST_SPACE_ID] }];
  },

  getSmlEntry: async () => ({
    type: kiType,
    title: `${SML_TEST_SEARCH_TOKEN} ${kiType}`,
    content: `${SML_TEST_SEARCH_TOKEN} fixture entry for SML type permission tests`,
  }),

  toAttachment: async () => undefined,

  ...(gated ? { getPermissions: () => kibanaPermissions({ kiType }) } : {}),
});

export const smlTestTypes: SmlTypeDefinition[] = [
  createFixtureSmlType(SML_TEST_PUBLIC_KI_TYPE, false),
  createFixtureSmlType(SML_TEST_GATED_KI_TYPE, true),
];
