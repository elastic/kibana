/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function denormalizePrivileges(role, application) {
  const {
    applications
  } = role;

  const rolePrivileges = applications.filter(a => a.application === application);

  let basePrivilege;
  const spacePrivileges = {};

  rolePrivileges.forEach(privilege => {
    const {
      resources,
      privileges
    } = privilege;

    if (privileges.length !== 1) {
      throw new Error(`Malformed privilege on role ${role.name}. Expected a single privilege, but found ${privileges.length}.`);
    }

    if (resources.length === 1 && resources[0] === "*") {
      basePrivilege = privileges[0];
    } else {
      resources.forEach(resource => {
        const existingSpacePrivs = spacePrivileges[resource] || [];
        spacePrivileges[resource] = [...existingSpacePrivs, ...privileges];
      });
    }
  });


  return {
    basePrivilege,
    spacePrivileges
  };
}
