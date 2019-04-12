/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
// @ts-ignore
import { getClient } from '../../../../server/lib/get_client_shield';

interface UserRealm {
  name: string;
  type: string;
}

export interface User {
  /**
   * User principal name.
   */
  username: string;

  /**
   * List of the roles assigned to the user.
   */
  roles: string[];

  /**
   * The name and type of the Realm that has authenticated the user.
   */
  authentication_realm: UserRealm;

  /**
   * The name and type of the Realm where the user information were retrieved from.
   */
  lookup_realm: UserRealm;
}

export function getUserProvider(server: any) {
  const callWithRequest = getClient(server).callWithRequest;

  server.expose('getUser', async (request: Request) => {
    const xpackInfo = server.plugins.xpack_main.info;
    if (xpackInfo && xpackInfo.isAvailable() && !xpackInfo.feature('security').isEnabled()) {
      return Promise.resolve(null);
    }
    return await callWithRequest(request, 'shield.authenticate');
  });
}
