/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datafeedsProvider } from './datafeeds';
import moment from 'moment';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

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

  async function jobsSummary(jobIds = []) {
    const fullJobsList = await createFullJobsList();

    const jobs = fullJobsList.map((job) => {
      const hasDatafeed = (job.datafeed_config !== undefined);
      const {
        earliest: earliestTimeStamp,
        latest: latestTimeStamp } = earliestAndLatestTimeStamps(job.data_counts);

      const tempJob = {
        id: job.job_id,
        description: (job.description || ''),
        groups: (job.groups || []),
        processed_record_count: job.data_counts.processed_record_count,
        memory_status: (job.model_size_stats) ? job.model_size_stats.memory_status : '',
        jobState: job.state,
        hasDatafeed,
        datafeedId: (hasDatafeed && job.datafeed_config.datafeed_id) ? job.datafeed_config.datafeed_id : '',
        datafeedState: (hasDatafeed && job.datafeed_config.state) ? job.datafeed_config.state : '',
        latestTimeStamp,
        earliestTimeStamp,
      };
      if (jobIds.find(j => (j === tempJob.id))) {
        tempJob.fullJob = job;
      }
      return tempJob;
    });

    return jobs;
  }

  async function createFullJobsList(jobIds = []) {
    const [ JOBS, JOB_STATS, DATAFEEDS, DATAFEED_STATS ] = [0, 1, 2, 3];

    const jobs = [];
    const datafeeds = [];
    const results = await Promise.all([
      callWithRequest('ml.jobs', { jobId: jobIds }),
      callWithRequest('ml.jobStats', { jobId: jobIds }),
      callWithRequest('ml.datafeeds'),
      callWithRequest('ml.datafeedStats'),
    ]);

    if (results[DATAFEEDS] && results[DATAFEEDS].datafeeds) {
      results[DATAFEEDS].datafeeds.forEach((datafeed) => {
        if (results[DATAFEED_STATS] && results[DATAFEED_STATS].datafeeds) {
          const datafeedStats = results[DATAFEED_STATS].datafeeds.find(ds => (ds.datafeed_id === datafeed.datafeed_id));
          if (datafeedStats) {
            datafeed.state = datafeedStats.state;
          }
        }
        datafeeds.push(datafeed);
      });
    }

    if (results[JOBS] && results[JOBS].jobs) {
      results[JOBS].jobs.forEach((job) => {
        job.data_counts = {};
        job.model_size_stats = {};
        job.datafeed_config = {};

        if (results[JOB_STATS] && results[JOB_STATS].jobs) {
          const jobStats = results[JOB_STATS].jobs.find(js => (js.job_id === job.job_id));
          if (jobStats !== undefined) {
            job.state = jobStats.state;
            job.data_counts = jobStats.data_counts;
            job.model_size_stats = jobStats.model_size_stats;
            if (jobStats.node) {
              job.node = jobStats.node;
            }
            if (jobStats.open_time) {
              job.open_time = jobStats.open_time;
            }
          }
        }

        const datafeed = datafeeds.find(df => (df.job_id === job.job_id));
        if (datafeed !== undefined) {
          job.datafeed_config = datafeed;
        }

        jobs.push(job);
      });
    }
    return jobs;
  }

  function earliestAndLatestTimeStamps(dataCounts) {
    const obj = {
      earliest: { string: '', unix: 0 },
      latest: { string: '', unix: 0 },
    };

    if (dataCounts.earliest_record_timestamp) {
      const ts = moment(dataCounts.earliest_record_timestamp);
      obj.earliest.string = ts.format(TIME_FORMAT);
      obj.earliest.unix = ts.valueOf();
      obj.earliest.moment = ts;
    }

    if (dataCounts.latest_record_timestamp) {
      const ts = moment(dataCounts.latest_record_timestamp);
      obj.latest.string = ts.format(TIME_FORMAT);
      obj.latest.unix = ts.valueOf();
      obj.latest.moment = ts;
    }

    return obj;
  }

  return {
    forceDeleteJob,
    deleteJobs,
    jobsSummary,
    createFullJobsList,
  };
}
