/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function datafeedServiceProvider(callWithRequest) {

  async function forceStartDatafeeds(datafeedIds, start, end) {
    const jobIds = {};
    const doStartsCalled = {};
    const results = {};

    datafeedIds.forEach((dId) => {
      const jId = dId.replace('datafeed-', ''); // change this. this should be from a look up from the datafeeds endpoint
      jobIds[dId] = jId;
      doStartsCalled[dId] = false;
    });

    for (const datafeedId of datafeedIds) {
      const jobId = jobIds[datafeedId];

      setTimeout(async () => {
        results[datafeedId] = await doStart(datafeedId);
      }, 10000);

      if (await openJob(jobId)) {
        results[datafeedId] = await doStart(datafeedId);
      }
    }

    return results;

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
  }

  async function openJob(jobId) {
    let opened = false;
    try {
      const resp = await callWithRequest('ml.openJob', { jobId });
      opened = resp.opened;
    } catch (error) {
      if (error.statusCode === 409) {
        opened = true;
      }
    }
    return opened;
  }

  async function startDatafeed(datafeedId, start, end) {
    return await callWithRequest('ml.startDatafeed', { datafeedId, start, end });
  }

  async function stopDatafeeds(datafeedIds) {
    const results = {};

    for (const datafeedId of datafeedIds) {
      results[datafeedId] = await callWithRequest('ml.stopDatafeed', { datafeedId });
    }

    return results;
  }

  return {
    forceStartDatafeeds,
    stopDatafeeds
  };
}
