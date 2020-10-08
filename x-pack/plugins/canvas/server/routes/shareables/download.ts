/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import { SHAREABLE_RUNTIME_FILE } from '../../../shareable_runtime/constants';
import { RouteInitializerDeps } from '../';
import { API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD } from '../../../common/lib/constants';

export function initializeDownloadShareableWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD,
      validate: false,
    },
    async (_context, _request, response) => {
      // TODO: check if this is still an issue on cloud after migrating to NP
      //
      // The option setting is not for typical use.  We're using it here to avoid
      // problems in Cloud environments.  See elastic/kibana#47405.
      // const file = handler.file(SHAREABLE_RUNTIME_FILE, { confine: false });
      const file = readFileSync(SHAREABLE_RUNTIME_FILE);
      return response.ok({
        headers: { 'content-type': 'application/octet-stream' },
        body: file,
      });
    }
  );
}
