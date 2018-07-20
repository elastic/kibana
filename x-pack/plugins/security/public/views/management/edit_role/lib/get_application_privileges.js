/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALL_RESOURCE } from '../../../../../common/constants';

export function getKibanaPrivilegesViewModel(applicationPrivileges, roleKibanaPrivileges) {
  const viewModel = {
    availablePrivileges: applicationPrivileges.map(privilege => privilege.name),
    assignedPrivileges: {
      [ALL_RESOURCE]: []
    }
  };

  if (!roleKibanaPrivileges || Object.keys(roleKibanaPrivileges).length === 0) {
    return viewModel;
  }

  Object.keys(roleKibanaPrivileges).forEach(resource => {
    const resourcePrivileges = roleKibanaPrivileges[resource];
    resourcePrivileges.forEach(privilege => {
      // we don't want to display privileges that aren't in our expected list of privileges
      if (viewModel.availablePrivileges.includes(privilege)) {
        const resourcePrivs = viewModel.assignedPrivileges[resource] || [];
        viewModel.assignedPrivileges[resource] = [
          ...resourcePrivs,
          privilege
        ];
      }
    });
  });

  return viewModel;
}

export function getKibanaPrivileges(kibanaPrivilegesViewModel) {
  const kibanaPrivileges = {};

  const resources = Object.keys(kibanaPrivilegesViewModel);
  resources.forEach(resource => {
    const selectedPrivileges = Object.keys(kibanaPrivilegesViewModel[resource]).filter(key => kibanaPrivilegesViewModel[resource][key]);
    if (selectedPrivileges.length > 0) {
      kibanaPrivileges[resource] = selectedPrivileges;
    }
  });

  return kibanaPrivileges;
}
