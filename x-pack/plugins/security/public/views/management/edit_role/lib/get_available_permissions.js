/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NO_PRIVILEGE_VALUE } from './constants';

export function getAvailablePermissions(minimumPrivilege, kibanaPrivileges) {
  switch (minimumPrivilege) {
    case NO_PRIVILEGE_VALUE:
      return kibanaPrivileges;
    case 'read':
      return filterPrivileges(kibanaPrivileges, ['read', 'all']);
    case 'all':
      return filterPrivileges(kibanaPrivileges, ['all']);
    default:
      throw new Error(`Unexpected minimumPrivilege value: ${minimumPrivilege}`);
  }
}

function filterPrivileges(allPrivileges, privilegesToKeep) {
  console.log(allPrivileges);
  return Object
    .keys(allPrivileges)
    .filter(privilege => privilegesToKeep.indexOf(privilege) >= 0)
    .reduce((acc, key) => ({ ...acc, [key]: allPrivileges[key] }), {});
}
