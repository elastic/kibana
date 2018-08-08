/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { PLUGIN } from '../../../common/constants';

export const licensePreRoutingFactory = (server) => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  function licensePreRouting(request, reply) {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
    if (!licenseCheckResults.enableAPIRoute) {
      reply(Boom.forbidden(licenseCheckResults.message));
    } else {
      reply();
    }
  }

  return licensePreRouting;
};
