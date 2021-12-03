/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from 'kibana/public';
import { CasePermissionOptions } from '../types';

export function canUseCases(capabilities: ApplicationStart['capabilities']) {
  const defaultCaseOptions = {
    owners: [],
    crudLevel: 'read',
  };
  return (options: CasePermissionOptions): boolean => {
    const casePermissions = { ...defaultCaseOptions, ...options };
    casePermissions.owners = casePermissions.owners.length
      ? casePermissions.owners
      : ['securitySolutionCases', 'observabilityCases'];

    for (const type of casePermissions.owners) {
      if (
        Object.hasOwnProperty.call(capabilities, type) &&
        capabilities[type][`${casePermissions.crudLevel}_cases`]
      ) {
        return true;
      }
    }
    return false;
  };
}
