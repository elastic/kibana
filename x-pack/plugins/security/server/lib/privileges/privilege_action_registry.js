/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { buildPrivilegeMap } from './privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { equivalentPrivileges } from './equivalent_privileges';

export async function registerPrivilegesWithCluster(server) {
  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  const expectedPrivileges = buildPrivilegeMap(application, kibanaVersion);

  server.log(['security', 'debug'], `Registering Kibana Privileges with Elasticsearch for ${application}`);

  const callCluster = getClient(server).callWithInternalUser;

  // we only want to post the privileges when they're going to change as Elasticsearch has
  // to clear the role cache to get these changes reflected in the _has_privileges API
  const existingPrivileges = await callCluster(`shield.getPrivilege`, { privilege: application });
  if (equivalentPrivileges(existingPrivileges, expectedPrivileges)) {
    server.log(['security', 'debug'], `Kibana Privileges already registered with Elasticearch for ${application}`);
    return;
  }

  server.log(['security', 'debug'], `Updated Kibana Privileges with Elasticearch for ${application}`);
  await callCluster('shield.postPrivileges', {
    body: expectedPrivileges
  });
}
