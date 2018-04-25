/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { getClient } from '../../../../../server/lib/get_client_shield';


const createRoleIfDoesntExist = async (callCluster, name) => {
  try {
    await callCluster('shield.getRole', { name });
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }

    await callCluster('shield.putRole', {
      name,
      body: {
        cluster: [],
        index: [],
        // application: [ { "privileges": [ "kibana:all" ], "resources": [ "*" ] } ]
      }
    });
  }
};

export async function createDefaultRoles(server) {
  const config = server.config();

  if (!config.get('xpack.security.rbac.createDefaultRoles')) {
    return;
  }

  const application = config.get('xpack.security.rbac.application');

  const callCluster = getClient(server).callWithInternalUser;

  const createKibanaUserRole = createRoleIfDoesntExist(callCluster, `${application}_rbac_user`);
  const createKibanaDashboardOnlyRole = createRoleIfDoesntExist(callCluster, `${application}_rbac_dashboard_only_user`);

  await Promise.all([createKibanaUserRole, createKibanaDashboardOnlyRole]);
}
