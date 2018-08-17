/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getKibanaPrivilegesViewModel(applicationPrivileges, roleKibanaPrivileges) {
  const viewModel = {
    availablePrivileges: applicationPrivileges.map(privilege => privilege.name),
    assignedPrivileges: {
      global: roleKibanaPrivileges.global || [],
      space: roleKibanaPrivileges.space || {}
    }
  };

  return viewModel;
}
