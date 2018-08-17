/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getKibanaPrivilegesViewModel(applicationPrivileges, roleKibanaPrivileges) {
  const viewModel = {
    availablePrivileges: applicationPrivileges.map(privilege => privilege.name),
    assignedPrivileges: {
      global: [],
      spaces: {

      }
    }
  };

  if (!roleKibanaPrivileges || Object.keys(roleKibanaPrivileges).length === 0) {
    return viewModel;
  }

  viewModel.assignedPrivileges.global = roleKibanaPrivileges.global;
  Object.keys(roleKibanaPrivileges.spaces).forEach(spaceId => {
    viewModel.assignedPrivileges.spaces[spaceId] = roleKibanaPrivileges.spaces[spaceId];
  });

  return viewModel;
}
