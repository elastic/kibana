/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLOUD_DEFAULT_PROXY_PORT = '9400';

export const convertCloudRemoteAddressToProxy = (proxy: string) => {
  const host = proxy.split(':')[0];
  const port = proxy.split(':')[1];
  if (!port) {
    return `${host}:${CLOUD_DEFAULT_PROXY_PORT}`;
  }
  return proxy;
};
