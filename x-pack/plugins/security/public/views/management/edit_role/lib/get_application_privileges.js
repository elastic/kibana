/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export function getKibanaPrivilegesViewModel(applicationPrivileges, roleKibanaPrivileges) {
  const viewModel = applicationPrivileges.global.reduce((acc, applicationPrivilege) => {
    acc[applicationPrivilege.name] = false;
    return acc;
  }, {});

  if (!roleKibanaPrivileges || roleKibanaPrivileges.length === 0) {
    return viewModel;
  }

  const assignedPrivileges = roleKibanaPrivileges.global;
  assignedPrivileges.forEach(assignedPrivilege => {
    // we don't want to display privileges that aren't in our expected list of privileges
    if (assignedPrivilege in viewModel) {
      viewModel[assignedPrivilege] = true;
    }
  });

  return viewModel;
}
