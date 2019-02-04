/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FeaturesPrivileges, Role } from '../../../../common/model';

export interface BuildRoleOpts {
  spacesPrivileges?: Array<{
    spaces: string[];
    base: string[];
    feature: FeaturesPrivileges;
  }>;
}

export const buildRole = (options: BuildRoleOpts = {}) => {
  const role: Role = {
    name: 'unit test role',
    elasticsearch: {
      indices: [],
      cluster: [],
      run_as: [],
    },
    kibana: [],
  };

  if (options.spacesPrivileges) {
    role.kibana.push(...options.spacesPrivileges);
  } else {
    role.kibana.push({
      spaces: [],
      base: [],
      feature: {},
    });
  }

  return role;
};
