/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export function routePreCheckLicense(server: any) {
  const xpackMainPlugin = server.plugins.xpack_main;
  const pluginId = 'spaces';
  return function forbidApiAccess(request: any) {
    const licenseCheckResults = xpackMainPlugin.info.feature(pluginId).getLicenseCheckResults();
    if (!licenseCheckResults.showSpaces) {
      return Boom.forbidden(licenseCheckResults.linksMessage);
    } else {
      return '';
    }
  };
}
