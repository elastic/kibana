/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oncePerServer } from './once_per_server';
import { getClient as getShieldClient } from '../../../../server/lib/get_client_shield';

function getUserFn(server) {
  const callShieldWithRequest = getShieldClient(server).callWithRequest;

  return async function getUser(request) {
    const xpackInfo = server.plugins.xpack_main.info;
    if (xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security').isEnabled()) {
      try {
        return await callShieldWithRequest(request, 'shield.authenticate');
      } catch (err) {
        server.log(['reporting', 'getUser', 'debug'], err);
        return null;
      }
    }

    return null;
  };
}

export const getUserFactory = oncePerServer(getUserFn);
