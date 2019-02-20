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
  return async function executeJob(job: JobDocPayload): Promise<JobDocOutputPseudo> {
    const { objects, headers, jobParams } = job; // FIXME how to remove payload.objects for cleanup?
    const { isImmediate, panel, visType } = jobParams;
    if (!isImmediate) {
      const req = { headers, server }; // FIXME use fake req

      return {
        content_type: CONTENT_TYPE_CSV,
        // @ts-ignore
        content: await generateCsv(req, server, visType, panel),
      };
    }

    // if job was created with "immediate", just return the data in the job doc
    // FIXME how would this work if they never had privilege to create a job
    return {
      content_type: CONTENT_TYPE_CSV,
      content: objects,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFn);
