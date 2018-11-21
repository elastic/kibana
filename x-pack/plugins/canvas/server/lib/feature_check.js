/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: replace this when we use the method exposed by security https://github.com/elastic/kibana/pull/24616
export const isSecurityEnabled = server => {
  const kibanaSecurity = server.plugins.security;
  const esSecurity = server.plugins.xpack_main.info.feature('security');

  return kibanaSecurity && esSecurity.isAvailable() && esSecurity.isEnabled();
};
