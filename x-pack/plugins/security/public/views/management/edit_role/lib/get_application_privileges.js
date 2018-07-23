/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

export function getKibanaPrivilegesViewModel(applicationPrivileges, roleKibanaPrivileges) {
  const viewModel = applicationPrivileges.reduce((acc, applicationPrivilege) => {
    acc[applicationPrivilege.name] = false;
    return acc;
  }, {});

  if (!roleKibanaPrivileges || roleKibanaPrivileges.length === 0) {
    return viewModel;
  }

  const assignedPrivileges = _.uniq(_.flatten(_.pluck(roleKibanaPrivileges, 'privileges')));
  assignedPrivileges.forEach(assignedPrivilege => {
    // we don't want to display privileges that aren't in our expected list of privileges
    if (assignedPrivilege in viewModel) {
      viewModel[assignedPrivilege] = true;
    }
  });

  return viewModel;
}

export function getKibanaPrivileges(kibanaPrivilegesViewModel) {
  const selectedPrivileges = Object.keys(kibanaPrivilegesViewModel).filter(key => kibanaPrivilegesViewModel[key]);

  // if we have any selected privileges, add a single application entry
  if (selectedPrivileges.length > 0) {
    return [
      {
        privileges: selectedPrivileges
      }
    ];
  }

  return [];
}
