/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { putLicense } from '../../../lib/license';
import { wrapEsError } from '../../../lib/wrap_es_error';

export function registerLicenseRoute(server) {
  const xpackInfo = server.plugins.xpack_main.info;
  server.route({
    path: '/api/license',
    method: 'PUT',
    handler: (request, reply) => {
      return putLicense(request, xpackInfo)
        .then(reply, e => reply(wrapEsError(e)));
    }
  });
}
