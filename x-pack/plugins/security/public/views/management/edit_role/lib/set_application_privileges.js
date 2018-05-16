/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_RESOURCE } from '../../../../../common/constants';

export function setApplicationPrivileges(kibanaPrivileges, role, application) {
  if (!role.applications) {
    role.applications = [];
  }

  // we first remove the matching application entries
  role.applications = role.applications.filter(x => {
    return x.application !== application;
  });

  const privileges = Object.keys(kibanaPrivileges).filter(key => kibanaPrivileges[key]);

  // if we still have them, put the application entry back
  if (privileges.length > 0) {
    role.applications = [...role.applications, {
      application,
      privileges,
      resources: [DEFAULT_RESOURCE]
    }];
  }
}
