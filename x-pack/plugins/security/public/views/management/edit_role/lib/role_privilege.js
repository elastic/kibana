/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

/**
 * Constructs a role privilege from the provided application privilege.
 * @param {*} appPrivilege
 * @param {*} application
 * @param {*} resources
 */
export function createRolePrivilege(appPrivilege, application, resources) {
  return {
    application,
    resources,
    privileges: [appPrivilege.name]
  };
}

/**
 * Adds or updates the provided role privilege to the indicated role.
 */
export function setRolePrivilege(rolePrivilege, role, application) {
  const privilegeName = rolePrivilege.privileges[0];

  removePrivilegeFromRole(privilegeName, role, application);

  role.applications.push(rolePrivilege);
}
