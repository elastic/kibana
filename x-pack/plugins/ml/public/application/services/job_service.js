/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, each, find, get, isNumber } from 'lodash';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import { ml } from './ml_api_service';

import { getToastNotificationService } from '../services/toast_notification_service';
import { isWebUrl } from '../util/url_utils';
import { ML_DATA_PREVIEW_COUNT } from '../../../common/util/job_utils';
import { TIME_FORMAT } from '../../../common/constants/time_format';
import { parseInterval } from '../../../common/util/parse_interval';
import { validateTimeRange } from '../../../common/util/date_utils';

let jobs = [];
let datafeedIds = {};

class JobService {
  constructor() {
    // tempJobCloningObjects -> used to pass a job object between the job management page and
    // and the advanced wizard.
    // if populated when loading the advanced wizard, the job is used for cloning.
    // if populated when loading the job management page, the start datafeed modal
    // is automatically opened.
    this.tempJobCloningObjects = {
      job: undefined,
      skipTimeRangeStep: false,
      start: undefined,
      end: undefined,
      calendars: undefined,
    };

    this.jobs = [];

    // Provide ready access to widely used basic job properties.
    // Note these get populated on a call to loadJobs.
    this.basicJobs = {};
    this.jobDescriptions = {};
    this.detectorsByJob = {};
    this.customUrlsByJob = {};
    this.jobStats = {
      activeNodes: {
        label: i18n.translate('xpack.ml.jobService.activeMLNodesLabel', {
          defaultMessage: 'Active ML nodes',
        }),
        value: 0,
        show: true,
      },
      total: {
        label: i18n.translate('xpack.ml.jobService.totalJobsLabel', {
          defaultMessage: 'Total jobs',
        }),
        value: 0,
        show: true,
      },
      open: {
        label: i18n.translate('xpack.ml.jobService.openJobsLabel', {
          defaultMessage: 'Open jobs',
        }),
        value: 0,
        show: true,
      },
      closed: {
        label: i18n.translate('xpack.ml.jobService.closedJobsLabel', {
          defaultMessage: 'Closed jobs',
        }),
        value: 0,
        show: true,
      },
      failed: {
        label: i18n.translate('xpack.ml.jobService.failedJobsLabel', {
          defaultMessage: 'Failed jobs',
        }),
        value: 0,
        show: false,
      },
      activeDatafeeds: {
        label: i18n.translate('xpack.ml.jobService.activeDatafeedsLabel', {
          defaultMessage: 'Active datafeeds',
        }),
        value: 0,
        show: true,
      },
    };
  }

  getBlankJob() {
    return {
      job_id: '',
      description: '',
      groups: [],
      analysis_config: {
        bucket_span: '15m',
        influencers: [],
        detectors: [],
      },
      data_description: {
        time_field: '',
        time_format: '', // 'epoch',
        field_delimiter: '',
        quote_character: '"',
        format: 'delimited',
      },
    };
  }

  loadJobs() {
    return new Promise((resolve, reject) => {
      jobs = [];
      datafeedIds = {};
      ml.getJobs()
        .then((resp) => {
          jobs = resp.jobs;

          // load jobs stats
          ml.getJobStats()
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
        getToastNotificationService().displayErrorToast(err);
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
      ml.getJobs({ jobId })
        .then((resp) => {
          if (resp.jobs && resp.jobs.length) {
            const newJob = resp.jobs[0];

            // load jobs stats
            ml.getJobStats({ jobId })
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

                const datafeedId = this.getDatafeedId(jobId);

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
        getToastNotificationService().displayErrorToast(err);
        reject({ jobs, err });
      }
    });
  }

  loadDatafeeds(datafeedId) {
    return new Promise((resolve, reject) => {
      const sId = datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined;

      ml.getDatafeeds(sId)
        .then((resp) => {
          const datafeeds = resp.datafeeds;

          // load datafeeds stats
          ml.getDatafeedStats()
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
        getToastNotificationService().displayErrorToast(err);
        reject({ jobs, err });
      }
    });
  }

  updateSingleJobDatafeedState(jobId) {
    return new Promise((resolve, reject) => {
      const datafeedId = this.getDatafeedId(jobId);

      ml.getDatafeedStats({ datafeedId })
        .then((resp) => {
          // console.log('updateSingleJobCounts controller query response:', resp);
          const datafeeds = resp.datafeeds;
          let state = 'UNKNOWN';
          if (datafeeds && datafeeds.length) {
            state = datafeeds[0].state;
          }
          resolve(state);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  saveNewJob(job) {
    // run then and catch through the same check
    function func(resp) {
      console.log('Response for job query:', resp);
      const success = checkSaveResponse(resp, job);
      return { success, job, resp };
    }

    // return the promise chain
    return ml.addJob({ jobId: job.job_id, job }).then(func).catch(func);
  }

  cloneJob(job) {
    // create a deep copy of a job object
    // also remove items from the job which are set by the server and not needed
    // in the future this formatting could be optional
    const tempJob = cloneDeep(job);

    // remove all of the items which should not be copied
    // such as counts, state and times
    delete tempJob.state;
    delete tempJob.job_version;
    delete tempJob.data_counts;
    delete tempJob.create_time;
    delete tempJob.finished_time;
    delete tempJob.last_data_time;
    delete tempJob.model_size_stats;
    delete tempJob.node;
    delete tempJob.average_bucket_processing_time_ms;
    delete tempJob.model_snapshot_id;
    delete tempJob.open_time;
    delete tempJob.established_model_memory;
    delete tempJob.calendars;
    delete tempJob.timing_stats;
    delete tempJob.forecasts_stats;
    delete tempJob.assignment_explanation;

    delete tempJob.analysis_config.use_per_partition_normalization;

    each(tempJob.analysis_config.detectors, (d) => {
      delete d.detector_index;
    });

    // remove parts of the datafeed config which should not be copied
    if (tempJob.datafeed_config) {
      delete tempJob.datafeed_config.datafeed_id;
      delete tempJob.datafeed_config.job_id;
      delete tempJob.datafeed_config.state;
      delete tempJob.datafeed_config.node;
      delete tempJob.datafeed_config.timing_stats;
      delete tempJob.datafeed_config.assignment_explanation;

      // remove query_delay if it's between 60s and 120s
      // the back-end produces a random value between 60 and 120 and so
      // by deleting it, the back-end will produce a new random value
      if (tempJob.datafeed_config.query_delay) {
        const interval = parseInterval(tempJob.datafeed_config.query_delay);
        if (interval !== null) {
          const queryDelay = interval.asSeconds();
          if (queryDelay > 60 && queryDelay < 120) {
            delete tempJob.datafeed_config.query_delay;
          }
        }
      }
    }

    // when jumping from a wizard to the advanced job creation,
    // the wizard's created_by information should be stripped.
    if (tempJob.custom_settings && tempJob.custom_settings.created_by) {
      delete tempJob.custom_settings.created_by;
    }

    return tempJob;
  }

  // find a job based on the id
  getJob(jobId) {
    const job = find(jobs, (j) => {
      return j.job_id === jobId;
    });

    return job;
  }

  searchPreview(job) {
    return new Promise((resolve, reject) => {
      if (job.datafeed_config) {
        // if query is set, add it to the search, otherwise use match_all
        let query = { match_all: {} };
        if (job.datafeed_config.query) {
          query = job.datafeed_config.query;
        }

        // Get bucket span
        // Get first doc time for datafeed
        // Create a new query - must user query and must range query.
        // Time range 'to' first doc time plus < 10 buckets

        // Do a preliminary search to get the date of the earliest doc matching the
        // query in the datafeed. This will be used to apply a time range criteria
        // on the datafeed search preview.
        // This time filter is required for datafeed searches using aggregations to ensure
        // the search does not create too many buckets (default 10000 max_bucket limit),
        // but apply it to searches without aggregations too for consistency.
        ml.getTimeFieldRange({
          index: job.datafeed_config.indices,
          timeFieldName: job.data_description.time_field,
          query,
        })
          .then((timeRange) => {
            const bucketSpan = parseInterval(job.analysis_config.bucket_span);
            const earliestMs = timeRange.start.epoch;
            const latestMs = +timeRange.start.epoch + 10 * bucketSpan.asMilliseconds();

            const body = {
              query: {
                bool: {
                  must: [
                    {
                      range: {
                        [job.data_description.time_field]: {
                          gte: earliestMs,
                          lt: latestMs,
                          format: 'epoch_millis',
                        },
                      },
                    },
                    query,
                  ],
                },
              },
            };

            // if aggs or aggregations is set, add it to the search
            const aggregations = job.datafeed_config.aggs || job.datafeed_config.aggregations;
            if (aggregations && Object.keys(aggregations).length) {
              body.size = 0;
              body.aggregations = aggregations;

              // add script_fields if present
              const scriptFields = job.datafeed_config.script_fields;
              if (scriptFields && Object.keys(scriptFields).length) {
                body.script_fields = scriptFields;
              }
            } else {
              // if aggregations is not set and retrieveWholeSource is not set, add all of the fields from the job
              body.size = ML_DATA_PREVIEW_COUNT;

              // add script_fields if present
              const scriptFields = job.datafeed_config.script_fields;
              if (scriptFields && Object.keys(scriptFields).length) {
                body.script_fields = scriptFields;
              }

              const fields = {};

              // get fields from detectors
              if (job.analysis_config.detectors) {
                each(job.analysis_config.detectors, (dtr) => {
                  if (dtr.by_field_name) {
                    fields[dtr.by_field_name] = {};
                  }
                  if (dtr.field_name) {
                    fields[dtr.field_name] = {};
                  }
                  if (dtr.over_field_name) {
                    fields[dtr.over_field_name] = {};
                  }
                  if (dtr.partition_field_name) {
                    fields[dtr.partition_field_name] = {};
                  }
                });
              }

              // get fields from influencers
              if (job.analysis_config.influencers) {
                each(job.analysis_config.influencers, (inf) => {
                  fields[inf] = {};
                });
              }

              // get fields from categorizationFieldName
              if (job.analysis_config.categorization_field_name) {
                fields[job.analysis_config.categorization_field_name] = {};
              }

              // get fields from summary_count_field_name
              if (job.analysis_config.summary_count_field_name) {
                fields[job.analysis_config.summary_count_field_name] = {};
              }

              // get fields from time_field
              if (job.data_description.time_field) {
                fields[job.data_description.time_field] = {};
              }

              const fieldsList = Object.keys(fields);
              if (fieldsList.length) {
                body.fields = fieldsList;
                body._source = false;
              }
            }

            const data = {
              index: job.datafeed_config.indices,
              body,
              ...(job.datafeed_config.indices_options || {}),
            };

            ml.esSearch(data)
              .then((resp) => {
                resolve(resp);
              })
              .catch((resp) => {
                reject(resp);
              });
          })
          .catch((resp) => {
            reject(resp);
          });
      }
    });
  }

  openJob(jobId) {
    return ml.openJob({ jobId });
  }

  closeJob(jobId) {
    return ml.closeJob({ jobId });
  }

  saveNewDatafeed(datafeedConfig, jobId) {
    const datafeedId = `datafeed-${jobId}`;
    datafeedConfig.job_id = jobId;

    return ml.addDatafeed({
      datafeedId,
      datafeedConfig,
    });
  }

  // start the datafeed for a given job
  // refresh the job state on start success
  startDatafeed(datafeedId, jobId, start, end) {
    return new Promise((resolve, reject) => {
      // if the end timestamp is a number, add one ms to it to make it
      // inclusive of the end of the data
      if (isNumber(end)) {
        end++;
      }

      ml.startDatafeed({
        datafeedId,
        start,
        end,
      })
        .then((resp) => {
          resolve(resp);
        })
        .catch((err) => {
          console.log('jobService error starting datafeed:', err);
          reject(err);
        });
    });
  }

  forceStartDatafeeds(dIds, start, end) {
    return ml.jobs.forceStartDatafeeds(dIds, start, end);
  }

  stopDatafeeds(dIds) {
    return ml.jobs.stopDatafeeds(dIds);
  }

  deleteJobs(jIds) {
    return ml.jobs.deleteJobs(jIds);
  }

  closeJobs(jIds) {
    return ml.jobs.closeJobs(jIds);
  }

  validateDetector(detector) {
    return new Promise((resolve, reject) => {
      if (detector) {
        ml.validateDetector({ detector })
          .then((resp) => {
            resolve(resp);
          })
          .catch((resp) => {
            reject(resp);
          });
      } else {
        reject({});
      }
    });
  }

  getDatafeedId(jobId) {
    let datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      datafeedId = `datafeed-${jobId}`;
    }
    return datafeedId;
  }

  getDatafeedPreview(datafeedId) {
    return ml.datafeedPreview({ datafeedId });
  }

  // get the list of job group ids as well as how many jobs are in each group
  getJobGroups() {
    const groups = [];
    const tempGroups = {};
    this.jobs.forEach((job) => {
      if (Array.isArray(job.groups)) {
        job.groups.forEach((group) => {
          if (tempGroups[group] === undefined) {
            tempGroups[group] = [job];
          } else {
            tempGroups[group].push(job);
          }
        });
      }
    });
    each(tempGroups, (js, id) => {
      groups.push({ id, jobs: js });
    });
    return groups;
  }

  createResultsUrlForJobs(jobsList, resultsPage, timeRange) {
    return createResultsUrlForJobs(jobsList, resultsPage, timeRange);
  }

  createResultsUrl(jobIds, from, to, resultsPage) {
    return createResultsUrl(jobIds, from, to, resultsPage);
  }

  async getJobAndGroupIds() {
    try {
      return await ml.jobs.getAllJobAndGroupIds();
    } catch (error) {
      return {
        jobIds: [],
        groupIds: [],
      };
    }
  }
}

// private function used to check the job saving response
function checkSaveResponse(resp, origJob) {
  if (resp) {
    if (resp.job_id) {
      if (resp.job_id === origJob.job_id) {
        console.log('checkSaveResponse(): save successful');
        return true;
      }
    } else {
      if (resp.errorCode) {
        console.log('checkSaveResponse(): save failed', resp);
        return false;
      }
    }
  } else {
    console.log('checkSaveResponse(): response is empty');
    return false;
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

function createResultsUrlForJobs(jobsList, resultsPage, userTimeRange) {
  let from = undefined;
  let to = undefined;
  let mode = 'absolute';
  const jobIds = jobsList.map((j) => j.id);

  // if the custom default time filter is set and enabled in advanced settings
  // if time is either absolute date or proper datemath format
  if (validateTimeRange(userTimeRange)) {
    from = userTimeRange.from;
    to = userTimeRange.to;
    // if both pass datemath's checks but are not technically absolute dates, use 'quick'
    // e.g. "now-15m" "now+1d"
    const fromFieldAValidDate = moment(userTimeRange.from).isValid();
    const toFieldAValidDate = moment(userTimeRange.to).isValid();
    if (!fromFieldAValidDate && !toFieldAValidDate) {
      return createResultsUrl(jobIds, from, to, resultsPage, 'quick');
    }
  } else {
    // if time range is specified but with incorrect format
    // change back to the default time range but alert the user
    // that the advanced setting config is invalid
    if (userTimeRange) {
      mode = 'invalid';
    }

    if (jobsList.length === 1) {
      from = jobsList[0].earliestTimestampMs;
      to = jobsList[0].latestResultsTimestampMs; // Will be max(latest source data, latest bucket results)
    } else {
      const jobsWithData = jobsList.filter((j) => j.earliestTimestampMs !== undefined);
      if (jobsWithData.length > 0) {
        from = Math.min(...jobsWithData.map((j) => j.earliestTimestampMs));
        to = Math.max(...jobsWithData.map((j) => j.latestResultsTimestampMs));
      }
    }
  }

  const fromString = moment(from).format(TIME_FORMAT); // Defaults to 'now' if 'from' is undefined
  const toString = moment(to).format(TIME_FORMAT); // Defaults to 'now' if 'to' is undefined

  return createResultsUrl(jobIds, fromString, toString, resultsPage, mode);
}

function createResultsUrl(jobIds, start, end, resultsPage, mode = 'absolute') {
  const idString = jobIds.map((j) => `'${j}'`).join(',');
  let from;
  let to;
  let path = '';

  if (resultsPage !== undefined) {
    path += resultsPage;
  }

  if (mode === 'quick') {
    from = start;
    to = end;
  } else {
    from = moment(start).toISOString();
    to = moment(end).toISOString();
  }

  path += `?_g=(ml:(jobIds:!(${idString}))`;
  path += `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${from}'`;
  path += `,to:'${to}'`;
  if (mode === 'invalid') {
    path += `,mode:invalid`;
  }
  path += "))&_a=(query:(query_string:(analyze_wildcard:!t,query:'*')))";

  return path;
}

export const mlJobService = new JobService();
