/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import archiver from 'archiver';
import { API_ROUTE_SHAREABLE_ZIP } from '../../../common/lib';
import {
  SHAREABLE_RUNTIME_FILE,
  SHAREABLE_RUNTIME_NAME,
  SHAREABLE_RUNTIME_SRC,
} from '../../../shareable_runtime/constants';
import { RenderedWorkpadSchema } from './rendered_workpad_schema';
import { RouteInitializerDeps } from '..';

export function initializeZipShareableWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.post(
    {
      path: API_ROUTE_SHAREABLE_ZIP,
      validate: { body: RenderedWorkpadSchema },
    },
    async (_context, request, response) => {
      const workpad = request.body;
      const archive = archiver('zip');
      archive.append(JSON.stringify(workpad), { name: 'workpad.json' });
      archive.file(`${SHAREABLE_RUNTIME_SRC}/template.html`, { name: 'index.html' });
      archive.file(SHAREABLE_RUNTIME_FILE, { name: `${SHAREABLE_RUNTIME_NAME}.js` });

      const result = { headers: { 'content-type': 'application/zip' }, body: archive };
      archive.finalize();

      return response.ok(result);
    }
  );
}
