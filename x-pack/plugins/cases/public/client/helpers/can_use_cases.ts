/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';

export type CasesOwners = typeof SECURITY_SOLUTION_OWNER | typeof OBSERVABILITY_OWNER;

/*
 * Returns an object denoting the current user's ability to read and crud cases.
 * If any owner(securitySolution, Observability) is found with crud or read capability respectively,
 * then crud or read is set to true.
 * Permissions for a specific owners can be found by passing an owner array
 */

export const canUseCases =
  (capabilities: Partial<ApplicationStart['capabilities']>) =>
  (
    owners: CasesOwners[] = [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]
  ): { crud: boolean; read: boolean } => ({
    crud:
      (capabilities && owners.some((owner) => capabilities[`${owner}Cases`]?.crud_cases)) ?? false,
    read:
      (capabilities && owners.some((owner) => capabilities[`${owner}Cases`]?.read_cases)) ?? false,
  });
