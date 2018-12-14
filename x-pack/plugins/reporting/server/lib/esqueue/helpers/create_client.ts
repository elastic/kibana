/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import elasticsearch from 'elasticsearch';

export function createClient(options) {
  let client;

  if (isClient(options)) {
    client = options;
  } else {
    client = new elasticsearch.Client(options);
  }

  return client;
}

export function isClient(client) {
  // if there's a transport property, assume it's a client instance
  return !!client.transport;
}
