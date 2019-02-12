/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { createTaggedLogger, cryptoFactory, oncePerServer } from '../../../server/lib';
import { JobDocPayload, KbnServer } from '../../../types';

interface JobDocOutputPseudo {
  content_type: 'text/csv';
  content: string;
}

/*
 * @return {Object}: pseudo-JobDocOutput. See interface JobDocOutput
 */
function executeJobFn(server: KbnServer) {
  return async function executeJob(job: JobDocPayload): Promise<JobDocOutputPseudo> {
    // if job was created with "immediate", just return the data in the job doc
    return {
      content_type: 'text/csv',
      content: job.objects,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
