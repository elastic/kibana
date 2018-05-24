/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SELECTED_SPACE_COOKIE, SELECTED_SPACE_COOKIE_TTL_MILLIS } from '../../common';

let rememberSelectedSpace;

export function initSelectedSpaceState(server, config) {
  rememberSelectedSpace = config.get('xpack.spaces.rememberSelectedSpace');
  if (!rememberSelectedSpace) {
    return;
  }

  server.state(SELECTED_SPACE_COOKIE, {
    ttl: SELECTED_SPACE_COOKIE_TTL_MILLIS,
    isHttpOnly: true,
    isSecure: config.get('server.ssl.enabled'),
    path: config.get('server.basePath') || null,
  });
}

export function setSelectedSpace(request, reply, urlContext) {
  if (!rememberSelectedSpace) {
    return;
  }

  const {
    [SELECTED_SPACE_COOKIE]: currentSelectedSpace
  } = request.state;

  // a blank url context is different from undefined. Blank == the Default Space, while undefined means there is no space selected.
  if (typeof urlContext === 'string' && urlContext !== currentSelectedSpace) {
    reply.state(SELECTED_SPACE_COOKIE, urlContext);
  }
}
