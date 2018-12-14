/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client, ConfigOptions } from 'elasticsearch';

export function createClient(options: ConfigOptions | Client) {
  let client;

  if (isClient(options)) {
    client = options;
  } else {
    client = new Client(options);
  }

  return client;
}

export function isClient(client: ConfigOptions | Client): client is Client {
  // if there's a transport property, assume it's a client instance
  return !!(client as any).transport;
}
