/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { API_BASE_URL } from '../../common/constants';
import { enqueueJobFactory } from '../lib/enqueue_job';
import { registerLegacy } from './legacy';
import { registerGenerate } from './generate';
import { registerJobs } from './jobs';

export function registerRoutes(server) {
  const config = server.config();
  const DOWNLOAD_BASE_URL = config.get('server.basePath') + `${API_BASE_URL}/jobs/download`;
  const { errors: esErrors } = server.plugins.elasticsearch.getCluster('admin');
  const enqueueJob = enqueueJobFactory(server);

  async function handler(exportTypeId, jobParams, request, h) {
    const user = request.pre.user;
    const headers = request.headers;

    const job = await enqueueJob(exportTypeId, jobParams, user, headers, request);

    // return the queue's job information
    const jobJson = job.toJSON();

    return h
      .response({
        path: `${DOWNLOAD_BASE_URL}/${jobJson.id}`,
        job: jobJson,
      })
      .type('application/json');
  }

  function handleError(exportType, err) {
    if (err instanceof esErrors['401']) {
      return boom.unauthorized(`Sorry, you aren't authenticated`);
    }
    if (err instanceof esErrors['403']) {
      return boom.forbidden(`Sorry, you are not authorized to create ${exportType} reports`);
    }
    if (err instanceof esErrors['404']) {
      return boom.boomify(err, { statusCode: 404 });
    }
    return err;
  }

  registerGenerate(server, handler, handleError);
  registerJobs(server, handler, handleError);
  registerLegacy(server, handler, handleError);
}
