/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin-types-common';

import type { Space } from '../../../common';

export const filterRolesAssignedToSpace = (roles: Role[], space: Space) => {
  return roles.filter((role) =>
    role.kibana.reduce((acc, cur) => {
      return (
        (cur.spaces.includes(space.name) || cur.spaces.includes('*')) &&
        Boolean(cur.base.length) &&
        acc
      );
    }, true)
  );
};
