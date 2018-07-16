/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function datafeedsProvider(callWithRequest) {

  async function forceStartDatafeeds(datafeedIds, start, end) {
    const jobIds = {};
    const doStartsCalled = {};
    const results = {};
    const START_TIMEOUT = 10000; // 10s

    async function doStart(datafeedId) {
      if (doStartsCalled[datafeedId] === false) {
        doStartsCalled[datafeedId] = true;
        try {
          await startDatafeed(datafeedId, start, end);
          return { started: true };

        } catch (error) {
          return { started: false, error };
        }
      }
    }

    datafeedIds.forEach((dId) => {
      const jId = dId.replace('datafeed-', ''); // change this. this should be from a look up from the datafeeds endpoint
      jobIds[dId] = jId;
      doStartsCalled[dId] = false;
    });

    for (const datafeedId of datafeedIds) {
      const jobId = jobIds[datafeedId];

      setTimeout(async () => {
        // in 10 seconds start the datafeed.
        // this should give the openJob enough time.
        // if not, the start request will be queued
        // behind the open request on the server.
        results[datafeedId] = await doStart(datafeedId);
      }, START_TIMEOUT);

      try {
        if (await openJob(jobId)) {
          results[datafeedId] = await doStart(datafeedId);
        }
      } catch (error) {
        results[datafeedId] = { started: false, error };
      }
    }

    return results;
  }

  async function openJob(jobId) {
    let opened = false;
    try {
      const resp = await callWithRequest('ml.openJob', { jobId });
      opened = resp.opened;
    } catch (error) {
      if (error.statusCode === 409) {
        opened = true;
      } else {
        throw error;
      }
    }
    return opened;
  }

  async function startDatafeed(datafeedId, start, end) {
    return callWithRequest('ml.startDatafeed', { datafeedId, start, end });
  }

  async function stopDatafeeds(datafeedIds) {
    const results = {};

    for (const datafeedId of datafeedIds) {
      results[datafeedId] = await callWithRequest('ml.stopDatafeed', { datafeedId });
    }

    return results;
  }

  async function forceDeleteDatafeed(datafeedId) {
    return callWithRequest('ml.deleteDatafeed', { datafeedId, force: true });
  }

  return {
    forceStartDatafeeds,
    stopDatafeeds,
    forceDeleteDatafeed,
  };
}
