/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import {
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { getUICapabilities } from './capabilities';
import { CasesPermissions } from '../../../common';

export type CasesOwners =
  | typeof SECURITY_SOLUTION_OWNER
  | typeof OBSERVABILITY_OWNER
  | typeof GENERAL_CASES_OWNER;

/*
 * Returns an object denoting the current user's ability to read and crud cases.
 * If any owner(securitySolution, Observability) is found with crud or read capability respectively,
 * then crud or read is set to true.
 * Permissions for a specific owners can be found by passing an owner array
 */
export const canUseCases =
  (capabilities: Partial<ApplicationStart['capabilities']>) =>
  (
    owners: CasesOwners[] = [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER, GENERAL_CASES_OWNER]
  ): CasesPermissions => {
    const aggregatedPermissions = owners.reduce<CasesPermissions>(
      (acc, owner) => {
        // TODO: this won't work for general cases, I think we need 'general' there instead of 'cases'
        const userCapabilitiesForOwner = getUICapabilities(capabilities[`${owner}Cases`]);

        acc.create = acc.create || userCapabilitiesForOwner.create;
        acc.read = acc.read || userCapabilitiesForOwner.read;
        acc.update = acc.update || userCapabilitiesForOwner.update;
        acc.delete = acc.delete || userCapabilitiesForOwner.delete;
        acc.push = acc.push || userCapabilitiesForOwner.push;
        acc.all = acc.all || userCapabilitiesForOwner.all;

        return acc;
      },
      {
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false,
        push: false,
      }
    );

    return {
      ...aggregatedPermissions,
    };
  };
