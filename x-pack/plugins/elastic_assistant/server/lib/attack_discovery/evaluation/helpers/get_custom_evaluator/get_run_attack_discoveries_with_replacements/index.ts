/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';
import type { Run } from 'langsmith/schemas';

import { getDiscoveriesWithOriginalValues } from '../../get_discoveries_with_original_values';

export const getRunAttackDiscoveriesWithReplacements = (run: Run): AttackDiscoveries => {
  const runAttackDiscoveries = run.outputs?.attackDiscoveries;
  const runReplacements = run.outputs?.replacements ?? {};

  // NOTE: calls to `parse` throw an error if the Run Input is invalid
  const validatedAttackDiscoveries = AttackDiscoveries.parse(runAttackDiscoveries);
  const validatedReplacements = Replacements.parse(runReplacements);

  const withReplacements = getDiscoveriesWithOriginalValues({
    attackDiscoveries: validatedAttackDiscoveries,
    replacements: validatedReplacements,
  });

  return withReplacements;
};
