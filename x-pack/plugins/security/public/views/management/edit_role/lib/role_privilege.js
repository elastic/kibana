/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

const hasPrivilege = (application, privilegeName) => application.privileges
  && application.privileges.length > 0
  && application.privileges[0] === privilegeName;

/**
 * Returns the indicated privilege from the role, if it exists.
 */
export function getRolePrivilege(privilegeName, role, application) {
  const {
    applications = []
  } = role;

  return applications.find(a => a.application === application && hasPrivilege(a, privilegeName));
}

/**
 * Removes the indicated privilege from the role.
 */
export function removePrivilegeFromRole(privilegeName, role, application) {
  const {
    applications = []
  } = role;

  role.applications = applications.filter(a => !(a.application === application && hasPrivilege(a, privilegeName)));
}

export function removePrivilegeFromRoleResources(privilegeName, role, application, resources) {
  const {
    applications = []
  } = role;

  applications.forEach(appPrivilege => {
    if (appPrivilege.application === application) {
      appPrivilege.resources = appPrivilege.resources.filter(privResource => resources.indexOf(privResource) === -1);
    }
  });

  // Remove any entries that are now empty as a result of this operation
  role.applications = applications.filter(appPrivilege => {
    return !(appPrivilege.application === application && appPrivilege.resources.length === 0);
  });
}

/**
 * Constructs a role privilege from the provided privilege name.
 * @param {*} privilegeName
 * @param {*} application
 * @param {*} resources
 */
export function createRolePrivilege(privilegeName, application, resources) {
  return {
    application,
    resources,
    privileges: [privilegeName]
  };
}

export function addPrivilegeToRole(privilegeName, role, application, resources) {
  const existingPrivilege = getRolePrivilege(privilegeName, role, application);
  if (existingPrivilege) {
    existingPrivilege.resources = uniq([...existingPrivilege.resources, ...resources]);
  } else {
    setRolePrivilege(createRolePrivilege(privilegeName, application, resources), role, application);
  }
}

/**
 * Adds or updates the provided role privilege to the indicated role.
 */
export function setRolePrivilege(rolePrivilege, role, application) {
  const privilegeName = rolePrivilege.privileges[0];

  removePrivilegeFromRole(privilegeName, role, application);

  role.applications.push(rolePrivilege);
}
