/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, each, find, get } from 'lodash';

import { parseInterval } from '../../../common/util/parse_interval';
import { createDatafeedId } from '../../../common/util/job_utils';

import { isWebUrl } from '../util/url_utils';
import { useMlApi } from '../contexts/kibana';

let jobs = [];
let datafeedIds = {};

class JobService {
  constructor(ml) {
    this.ml = ml;

    this.jobs = [];

    // Provide ready access to widely used basic job properties.
    // Note these get populated on a call to loadJobs.
    this.basicJobs = {};
    this.jobDescriptions = {};
    this.detectorsByJob = {};
    this.customUrlsByJob = {};
  }

  loadJobs() {
    return new Promise((resolve, reject) => {
      jobs = [];
      datafeedIds = {};
      this.ml
        .getJobs()
        .then((resp) => {
          jobs = resp.jobs;

          // load jobs stats
          this.ml
            .getJobStats()
            .then((statsResp) => {
              // merge jobs stats into jobs
              for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                // create empty placeholders for stats and datafeed objects
                job.data_counts = {};
                job.model_size_stats = {};
                job.datafeed_config = {};

                for (let j = 0; j < statsResp.jobs.length; j++) {
                  const jobStats = statsResp.jobs[j];
                  if (job.job_id === jobStats.job_id) {
                    job.state = jobStats.state;
                    job.data_counts = cloneDeep(jobStats.data_counts);
                    job.model_size_stats = cloneDeep(jobStats.model_size_stats);
                    if (jobStats.node) {
                      job.node = cloneDeep(jobStats.node);
                    }
                    if (jobStats.open_time) {
                      job.open_time = jobStats.open_time;
                    }
                  }
                }
              }
              this.loadDatafeeds().then((datafeedsResp) => {
                for (let i = 0; i < jobs.length; i++) {
                  for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                    if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                      jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                      datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                    }
                  }
                }
                processBasicJobInfo(this, jobs);
                this.jobs = jobs;
                resolve({ jobs: this.jobs });
              });
            })
            .catch((err) => {
              error(err);
            });
        })
        .catch((err) => {
          error(err);
        });

      function error(err) {
        console.log('jobService error getting list of jobs:', err);
        reject({ jobs, err });
      }
    });
  }

  loadJobsWrapper = () => {
    return this.loadJobs()
      .then(function (resp) {
        return resp;
      })
      .catch(function (error) {
        console.log('Error loading jobs in route resolve.', error);
        // Always resolve to ensure tab still works.
        Promise.resolve([]);
      });
  };

  refreshJob(jobId) {
    return new Promise((resolve, reject) => {
      this.ml
        .getJobs({ jobId })
        .then((resp) => {
          if (resp.jobs && resp.jobs.length) {
            const newJob = resp.jobs[0];

            // load jobs stats
            this.ml
              .getJobStats({ jobId })
              .then((statsResp) => {
                // merge jobs stats into jobs
                for (let j = 0; j < statsResp.jobs.length; j++) {
                  if (newJob.job_id === statsResp.jobs[j].job_id) {
                    const statsJob = statsResp.jobs[j];
                    newJob.state = statsJob.state;
                    newJob.data_counts = {};
                    newJob.model_size_stats = {};
                    newJob.data_counts = cloneDeep(statsJob.data_counts);
                    newJob.model_size_stats = cloneDeep(statsJob.model_size_stats);
                    if (newJob.node) {
                      newJob.node = cloneDeep(statsJob.node);
                    }

                    if (statsJob.open_time) {
                      newJob.open_time = statsJob.open_time;
                    }
                  }
                }

                // replace the job in the jobs array
                for (let i = 0; i < jobs.length; i++) {
                  if (jobs[i].job_id === newJob.job_id) {
                    jobs[i] = newJob;
                  }
                }

                const datafeedId = createDatafeedId(jobId);

                this.loadDatafeeds(datafeedId).then((datafeedsResp) => {
                  for (let i = 0; i < jobs.length; i++) {
                    for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                      if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                        jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                        datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                      }
                    }
                  }
                  this.jobs = jobs;
                  resolve({ jobs: this.jobs });
                });
              })
              .catch((err) => {
                error(err);
              });
          }
        })
        .catch((err) => {
          error(err);
        });

      function error(err) {
        console.log('JobService error getting list of jobs:', err);
        reject({ jobs, err });
      }
    });
  }

  loadDatafeeds(datafeedId) {
    return new Promise((resolve, reject) => {
      const sId = datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined;

      this.ml
        .getDatafeeds(sId)
        .then((resp) => {
          const datafeeds = resp.datafeeds;

          // load datafeeds stats
          this.ml
            .getDatafeedStats()
            .then((statsResp) => {
              // merge datafeeds stats into datafeeds
              for (let i = 0; i < datafeeds.length; i++) {
                const datafeed = datafeeds[i];
                for (let j = 0; j < statsResp.datafeeds.length; j++) {
                  if (datafeed.datafeed_id === statsResp.datafeeds[j].datafeed_id) {
                    datafeed.state = statsResp.datafeeds[j].state;
                  }
                }
              }
              resolve({ datafeeds });
            })
            .catch((err) => {
              error(err);
            });
        })
        .catch((err) => {
          error(err);
        });

      function error(err) {
        console.log('loadDatafeeds error getting list of datafeeds:', err);
        reject({ jobs, err });
      }
    });
  }

  // find a job based on the id
  getJob(jobId) {
    const job = find(jobs, (j) => {
      return j.job_id === jobId;
    });

    return job;
  }
}

function processBasicJobInfo(localJobService, jobsList) {
  // Process the list of job data obtained from the jobs endpoint to return
  // an array of objects containing the basic information (id, description, bucketSpan,
  // and detectors properties, plus a customUrls key if custom URLs
  // have been configured for the job) used by various result dashboards in the ml plugin.
  // The key information is stored in the jobService object for quick access.
  const processedJobsList = [];
  const detectorsByJob = {};
  const customUrlsByJob = {};

  // use cloned copy of jobs list so not to alter the original
  const jobsListCopy = cloneDeep(jobsList);

  each(jobsListCopy, (jobObj) => {
    const analysisConfig = jobObj.analysis_config;
    const bucketSpan = parseInterval(analysisConfig.bucket_span);

    const job = {
      id: jobObj.job_id,
      bucketSpanSeconds: bucketSpan.asSeconds(),
    };

    if (jobObj.description !== undefined && /^\s*$/.test(jobObj.description) === false) {
      job.description = jobObj.description;
    } else {
      // Just use the id as the description.
      job.description = jobObj.job_id;
    }

    job.detectors = get(analysisConfig, 'detectors', []);
    detectorsByJob[job.id] = job.detectors;

    if (jobObj.custom_settings !== undefined && jobObj.custom_settings.custom_urls !== undefined) {
      job.customUrls = [];
      each(jobObj.custom_settings.custom_urls, (url) => {
        if (url.url_name !== undefined && url.url_value !== undefined && isWebUrl(url.url_value)) {
          // Only make web URLs (i.e. http or https) available in dashboard drilldowns.
          job.customUrls.push(url);
        }
      });
      // Only add an entry for a job if customUrls have been defined.
      if (job.customUrls.length > 0) {
        customUrlsByJob[job.id] = job.customUrls;
      }
    }

    localJobService.jobDescriptions[job.id] = job.description;
    localJobService.basicJobs[job.id] = job;
    processedJobsList.push(job);
  });

  localJobService.detectorsByJob = detectorsByJob;
  localJobService.customUrlsByJob = customUrlsByJob;

  return processedJobsList;
}

// This is to retain the singleton behavior of the previous direct instantiation and export.
let mlJobService;
export const mlJobServiceFactory = (mlApi) => {
  if (mlJobService) return mlJobService;

  mlJobService = new JobService(mlApi);
  return mlJobService;
};

export const useMlJobService = () => {
  const mlApi = useMlApi();
  return mlJobServiceFactory(mlApi);
};
