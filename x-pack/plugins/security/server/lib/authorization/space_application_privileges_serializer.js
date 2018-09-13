/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const privilegePrefix = `space_`;
const resourcePrefix = `space:`;

export const spaceApplicationPrivilegesSerializer = {
  privilege: {
    serialize(privilege) {
      return `${privilegePrefix}${privilege}`;
    },
    deserialize(privilege) {
      if (!privilege.startsWith(privilegePrefix)) {
        throw new Error(`Space privilege should have started with ${privilegePrefix}`);
      }

      return privilege.slice(privilegePrefix.length);
    },
  },
  resource: {
    serialize(spaceId) {
      return `${resourcePrefix}${spaceId}`;
    },
    deserialize(resource) {
      if (!resource.startsWith(resourcePrefix)) {
        throw new Error(`Resource should have started with ${resourcePrefix}`);
      }

      return resource.slice(resourcePrefix.length);
    }
  },
};
