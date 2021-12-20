/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from 'kibana/public';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../common/constants';

export type CasesOwners = typeof SECURITY_SOLUTION_OWNER | typeof OBSERVABILITY_OWNER;

export function canUseCases(capabilities: ApplicationStart['capabilities']) {
  return (
    owners: CasesOwners[] = [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]
  ): { crud: boolean; read: boolean } => {
    let crud = false;
    let read = false;

    if (owners.length) {
      crud = owners.some((owner) => capabilities[`${owner}Cases`].crud_cases);
      read = owners.some((owner) => capabilities[`${owner}Cases`].read_cases);
    }

    return {
      crud,
      read,
    };
  };
}
