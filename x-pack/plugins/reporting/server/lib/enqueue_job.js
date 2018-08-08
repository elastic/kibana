/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { events as esqueueEvents } from './esqueue';
import { oncePerServer } from './once_per_server';

function enqueueJobFn(server) {
  const jobQueue = server.plugins.reporting.queue;
  const queueConfig = server.config().get('xpack.reporting.queue');
  const exportTypesRegistry = server.plugins.reporting.exportTypesRegistry;

  return async function enqueueJob(exportTypeId, jobParams, user, headers, request) {
    const exportType = exportTypesRegistry.getById(exportTypeId);
    const createJob = exportType.createJobFactory(server);
    const payload = await createJob(jobParams, headers, request);

    const options = {
      timeout: queueConfig.timeout,
      created_by: get(user, 'username', false),
    };

    return new Promise((resolve, reject) => {
      const job = jobQueue.addJob(exportType.jobType, payload, options);

      job.on(esqueueEvents.EVENT_JOB_CREATED, (createdJob) => {
        if (createdJob.id === job.id) {
          server.log(['reporting', 'debug'], `Saved object to process`);
          resolve(job);
        }
      });
      job.on(esqueueEvents.EVENT_JOB_CREATE_ERROR, reject);
    });
  };
}

export const enqueueJobFactory = oncePerServer(enqueueJobFn);
