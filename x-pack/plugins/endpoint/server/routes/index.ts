/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, KibanaResponseFactory } from 'kibana/server';

export function addRoutes(router: IRouter) {
  router.get(
    {
      path: '/endpoint/hello-world',
      validate: false,
    },
    greetingIndex
  );
}

async function greetingIndex(...passedArgs: [unknown, unknown, KibanaResponseFactory]) {
  const [, , response] = passedArgs;
  return response.ok({
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
