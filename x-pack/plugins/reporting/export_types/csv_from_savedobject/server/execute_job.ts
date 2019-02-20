/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CONTENT_TYPE_CSV } from '../../../common/constants';
// @ts-ignore
import { createTaggedLogger, cryptoFactory, oncePerServer } from '../../../server/lib';
import { JobDocPayload, KbnServer } from '../../../types';
import {} from '../types';
import { generateCsv } from './lib/generate_csv';

interface JobDocOutputPseudo {
  content_type: 'text/csv';
  content: string | null;
}

/*
 * @return {Object}: pseudo-JobDocOutput. See interface JobDocOutput
 */
function executeJobFn(server: KbnServer) {
  // WTH why are the job params not passed in here?
  return async function executeJob(job: JobDocPayload): Promise<JobDocOutputPseudo> {
    const { objects, headers, jobParams } = job;
    if (objects == null) {
      // FIXME use fake req
      const req = { headers };
      const { panel } = jobParams;

      return {
        content_type: CONTENT_TYPE_CSV,
        // @ts-ignore
        content: await generateCsv(req, server, jobParams.savedObjectType, panel, false), // FIXME use fake req and actual job params
      };
    }

    // if job was created with "immediate", just return the data in the job doc
    // FIXME how would this work if they never had privilege to create a job
    return {
      content_type: CONTENT_TYPE_CSV,
      content: job.objects,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
