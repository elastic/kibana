/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Boom = require('boom');

export function routePreCheckLicense(server) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const pluginId = 'security';
  return function forbidApiAccess(request, reply) {
    const licenseCheckResults = xpackMainPlugin.info.feature(pluginId).getLicenseCheckResults();
    if (!licenseCheckResults.showLinks) {
      reply(Boom.forbidden(licenseCheckResults.linksMessage));
    } else {
      reply();
    }
  };
}
