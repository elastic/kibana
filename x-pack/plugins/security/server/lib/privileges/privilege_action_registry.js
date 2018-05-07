/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { buildPrivilegeMap } from './privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';

export async function registerPrivilegesWithCluster(server) {
  return;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  const privilegeActionMapping = buildPrivilegeMap(application, kibanaVersion);

  server.log(['security', 'debug'], `Registering Kibana Privileges with Elasticsearch for ${application}`);

  const callCluster = getClient(server).callWithInternalUser;

  // TODO(legrego) - non-working stub
  await callCluster('shield.postPrivileges', {
    body: {
      [application]: privilegeActionMapping
    }
  });
}
