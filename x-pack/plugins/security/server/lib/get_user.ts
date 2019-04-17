/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
// @ts-ignore
import { getClient } from '../../../../server/lib/get_client_shield';

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
