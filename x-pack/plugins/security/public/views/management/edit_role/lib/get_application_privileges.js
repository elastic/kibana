/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

export function getKibanaPrivileges(kibanaApplicationPrivilege, role, application) {
  const kibanaPrivileges = kibanaApplicationPrivilege.reduce((acc, p) => {
    acc[p.name] = false;
    return acc;
  }, {});

  if (!role.applications || role.applications.length === 0) {
    return kibanaPrivileges;
  }

  const applications = role.applications.filter(x => x.application === application);

  const assigned = _.uniq(_.flatten(_.pluck(applications, 'privileges')));
  assigned.forEach(a => {
    kibanaPrivileges[a] = true;
  });

  return kibanaPrivileges;
}
