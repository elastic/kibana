/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const isSecurityEnabled = server => {
  const securityPlugin = server.plugins.security;
  const xpackInfo = server.plugins.xpack_main.info;

  return (
    securityPlugin &&
    xpackInfo.isAvailable() &&
    xpackInfo.feature('security').isEnabled() &&
    !xpackInfo.license.isOneOf('basic')
  );
};
