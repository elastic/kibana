/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';


const createRoleIfDoesntExist = async (callCluster, { name, application, privilege }) => {
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
        applications: [
          {
            application,
            privileges: [ privilege ],
            resources: [ DEFAULT_RESOURCE ]
          }
        ]
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

  const createKibanaUserRole = createRoleIfDoesntExist(callCluster, {
    name: `${application}_rbac_user`,
    application,
    privilege: 'all'
  });

  const createKibanaDashboardOnlyRole = createRoleIfDoesntExist(callCluster, {
    name: `${application}_rbac_dashboard_only_user`,
    application,
    privilege: 'read'
  });

  await Promise.all([createKibanaUserRole, createKibanaDashboardOnlyRole]);
}
