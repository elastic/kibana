/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export function verifyApiAccessPre(request, reply) {
  const xpackInfo = request.server.plugins.xpack_main.info;
  const graph = xpackInfo.feature('graph');
  const licenseCheckResults = graph.getLicenseCheckResults();

  if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
    reply();
  } else {
    reply(Boom.forbidden(licenseCheckResults.message));
  }
}
