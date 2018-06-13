/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datafeedsProvider } from './datafeeds';

export function jobsProvider(callWithRequest) {

  const { forceDeleteDatafeed } = datafeedsProvider(callWithRequest);

  async function forceDeleteJob(jobId) {
    return callWithRequest('ml.deleteJob', { jobId, force: true });
  }

  async function deleteJobs(jobIds) {
    const results = {};
    const datafeedIds = jobIds.reduce((p, c) => {
      p[c] = `datafeed-${c}`;
      return p;
    }, {});

    for (const jobId of jobIds) {
      try {
        const datafeedResp = await forceDeleteDatafeed(datafeedIds[jobId]);
        if (datafeedResp.acknowledged) {
          try {
            await forceDeleteJob(jobId);
            results[jobId] = { deleted: true };
          } catch (error) {
            results[jobId] = { deleted: false, error };
          }
        }
      } catch (error) {
        results[jobId] = { deleted: false, error };
      }
    }
    return results;
  }

  return {
    forceDeleteJob,
    deleteJobs,
  };
}
