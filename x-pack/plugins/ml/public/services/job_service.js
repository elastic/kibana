/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';

import { parseInterval } from 'ui/utils/parse_interval';

import { FieldsServiceProvider } from 'plugins/ml/services/fields_service';
import { labelDuplicateDetectorDescriptions } from 'plugins/ml/util/anomaly_utils';
import { isWebUrl } from 'plugins/ml/util/string_utils';
import { ML_DATA_PREVIEW_COUNT } from 'plugins/ml/../common/util/job_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlJobService', function ($rootScope, $http, $q, es, ml, mlMessageBarService, Private) {
  const msgs = mlMessageBarService;
  let jobs = [];
  let datafeedIds = {};
  this.currentJob = undefined;
  this.jobs = [];

  // Provide ready access to widely used basic job properties.
  // Note these get populated on a call to either loadJobs or getBasicJobInfo.
  this.basicJobs = {};
  this.jobDescriptions = {};
  this.detectorsByJob = {};
  this.customUrlsByJob = {};
  this.jobStats = {
    activeNodes: { label: 'Active ML Nodes', value: 0, show: true },
    total: { label: 'Total jobs', value: 0, show: true },
    open: { label: 'Open jobs', value: 0, show: true },
    closed: { label: 'Closed jobs', value: 0, show: true },
    failed: { label: 'Failed jobs', value: 0, show: false },
    activeDatafeeds: { label: 'Active datafeeds', value: 0, show: true }
  };
  this.jobUrls = {};

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

  this.getBlankJob = function () {
    return {
      job_id: '',
      description: '',
      groups: [],
      analysis_config: {
        bucket_span: '15m',
        influencers: [],
        detectors: []
      },
      data_description: {
        time_field: '',
        time_format: '', // 'epoch',
        field_delimiter: '',
        quote_character: '"',
        format: 'delimited'
      }
    };
  };

  this.loadJobs = function () {
    const deferred = $q.defer();
    jobs = [];
    datafeedIds = {};

    ml.jobs()
      .then((resp) => {
        // make deep copy of jobs
        angular.copy(resp.jobs, jobs);

        // load jobs stats
        ml.jobStats()
          .then((statsResp) => {
            // merge jobs stats into jobs
            for (let i = 0; i < jobs.length; i++) {
              const job = jobs[i];
              // create empty placeholders for stats and datafeed objects
              job.data_counts = {};
              job.model_size_stats = {};
              job.datafeed_config = {};

              for (let j = 0; j < statsResp.jobs.length; j++) {
                if (job.job_id === statsResp.jobs[j].job_id) {
                  const jobStats = angular.copy(statsResp.jobs[j]);

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
            }
            this.loadDatafeeds()
              .then((datafeedsResp) => {
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
                createJobStats(this.jobs, this.jobStats);
                createJobUrls(this.jobs, this.jobUrls);
                deferred.resolve({ jobs: this.jobs });
              });
          })
          .catch((err) => {
            error(err);
          });
      }).catch((err) => {
        error(err);
      });

    function error(err) {
      console.log('MlJobsList error getting list of jobs:', err);
      msgs.error('Jobs list could not be retrieved');
      msgs.error('', err);
      deferred.reject({ jobs, err });
    }
    return deferred.promise;
  };

  this.refreshJob = function (jobId) {
    const deferred = $q.defer();
    ml.jobs({ jobId })
      .then((resp) => {
        console.log('refreshJob query response:', resp);
        const newJob = {};
        if (resp.jobs && resp.jobs.length) {
          angular.copy(resp.jobs[0], newJob);

          // load jobs stats
          ml.jobStats({ jobId })
            .then((statsResp) => {
              // merge jobs stats into jobs
              for (let j = 0; j < statsResp.jobs.length; j++) {
                if (newJob.job_id === statsResp.jobs[j].job_id) {
                  const statsJob = statsResp.jobs[j];
                  newJob.state = statsJob.state;
                  newJob.data_counts = {};
                  newJob.model_size_stats = {};
                  angular.copy(statsJob.data_counts, newJob.data_counts);
                  angular.copy(statsJob.model_size_stats, newJob.model_size_stats);
                  if (newJob.node) {
                    angular.copy(statsJob.node, newJob.node);
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

              this.loadDatafeeds(datafeedId)
                .then((datafeedsResp) => {
                  for (let i = 0; i < jobs.length; i++) {
                    for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                      if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                        jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                        datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                      }
                    }
                  }
                  this.jobs = jobs;
                  createJobStats(this.jobs, this.jobStats);
                  createJobUrls(this.jobs, this.jobUrls);
                  deferred.resolve({ jobs: this.jobs });
                });
            })
            .catch((err) => {
              error(err);
            });
        }
      }).catch((err) => {
        error(err);
      });

    function error(err) {
      console.log('MlJobsList error getting list of jobs:', err);
      msgs.error('Jobs list could not be retrieved');
      msgs.error('', err);
      deferred.reject({ jobs, err });
    }
    return deferred.promise;
  };

  this.loadDatafeeds = function (datafeedId) {
    const deferred = $q.defer();
    const datafeeds = [];
    const sId = (datafeedId !== undefined) ? { datafeed_id: datafeedId } : undefined;

    ml.datafeeds(sId)
      .then((resp) => {
        // console.log('loadDatafeeds query response:', resp);

        // make deep copy of datafeeds
        angular.copy(resp.datafeeds, datafeeds);

        // load datafeeds stats
        ml.datafeedStats()
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
            deferred.resolve({ datafeeds });
          })
          .catch((err) => {
            error(err);
          });
      }).catch((err) => {
        error(err);
      });

    function error(err) {
      console.log('loadDatafeeds error getting list of datafeeds:', err);
      msgs.error('datafeeds list could not be retrieved');
      msgs.error('', err);
      deferred.reject({ jobs, err });
    }
    return deferred.promise;
  };



  this.updateSingleJobCounts = function (jobId) {
    const deferred = $q.defer();
    console.log('mlJobService: update job counts and state for ' + jobId);
    ml.jobStats({ jobId })
      .then((resp) => {
        console.log('updateSingleJobCounts controller query response:', resp);
        if (resp.jobs && resp.jobs.length) {
          const newJob = {};
          angular.copy(resp.jobs[0], newJob);

          // replace the job in the jobs array
          for (let i = 0; i < jobs.length; i++) {
            if (jobs[i].job_id === jobId) {
              const job = jobs[i];
              job.state = newJob.state;
              job.data_counts = newJob.data_counts;
              if (newJob.model_size_stats) {
                job.model_size_stats = newJob.model_size_stats;
              }
              if (newJob.node) {
                job.node = newJob.node;
              }
              if (newJob.open_time) {
                job.open_time = newJob.open_time;
              }
            }
          }

          const datafeedId = this.getDatafeedId(jobId);

          this.loadDatafeeds(datafeedId)
            .then((datafeedsResp) => {
              for (let i = 0; i < jobs.length; i++) {
                for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                  if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                    jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                    datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                  }
                }
              }
              createJobStats(this.jobs, this.jobStats);
              createJobUrls(this.jobs, this.jobUrls);
              deferred.resolve({ jobs: this.jobs });
            })
            .catch((err) => {
              error(err);
            });
        } else {
          deferred.resolve({ jobs: this.jobs });
        }

      }).catch((err) => {
        error(err);
      });

    function error(err) {
      console.log('updateSingleJobCounts error getting job details:', err);
      msgs.error('Job details could not be retrieved for ' + jobId);
      msgs.error('', err);
      deferred.reject({ jobs, err });
    }

    return deferred.promise;
  };

  this.updateAllJobStats = function () {
    const deferred = $q.defer();
    console.log('mlJobService: update all jobs counts and state');
    ml.jobStats().then((resp) => {
      console.log('updateAllJobStats controller query response:', resp);
      let newJobsAdded = false;
      for (let d = 0; d < resp.jobs.length; d++) {
        const newJobStats = {};
        let jobExists = false;
        angular.copy(resp.jobs[d], newJobStats);

        // update parts of the job
        for (let i = 0; i < jobs.length; i++) {
          const job = jobs[i];
          if (job.job_id === newJobStats.job_id) {
            jobExists = true;
            job.state = newJobStats.state;
            job.data_counts = newJobStats.data_counts;
            if (newJobStats.model_size_stats) {
              job.model_size_stats = newJobStats.model_size_stats;
            }
            if (newJobStats.node) {
              job.node = newJobStats.node;
            }
            if (newJobStats.open_time) {
              job.open_time = newJobStats.open_time;
            }
          }
        }

        // a new job has been added, add it to the list
        if (!jobExists) {
          // add it to the same index position as it's found in jobs.
          jobs.splice(d, 0, newJobStats);
          newJobsAdded = true;
        }
      }

      // load datafeeds stats
      ml.datafeedStats()
        .then((datafeedsResp) => {
          for (let i = 0; i < jobs.length; i++) {
            const datafeed = jobs[i].datafeed_config;
            if (datafeed) {
              for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                const newDatafeedStats = {};
                angular.copy(datafeedsResp.datafeeds[j], newDatafeedStats);

                if (datafeed.datafeed_id === newDatafeedStats.datafeed_id) {
                  datafeed.state = newDatafeedStats.state;
                  if (newDatafeedStats.node) {
                    datafeed.node = newDatafeedStats.node;
                  }
                }
              }
            }
          }
          this.jobs = jobs;

          // if after adding missing jobs, the retrieved number of jobs still differs from
          // the local copy, reload the whole list from scratch. some non-running jobs may have
          // been deleted by a different user.
          if (newJobsAdded || resp.jobs.length !== jobs.length) {
            console.log('updateAllJobStats: number of jobs differs. reloading all jobs');
            this.loadJobs().then(() => {
              deferred.resolve({ jobs: this.jobs, listChanged: true });
            })
              .catch((err) => {
                error(err);
              });
          } else {
            createJobStats(this.jobs, this.jobStats);
            createJobUrls(this.jobs, this.jobUrls);
            deferred.resolve({ jobs: this.jobs, listChanged: false });
          }
        })
        .catch((err) => {
          error(err);
        });
    })
      .catch((err) => {
        error(err);
      });

    function error(err) {
      console.log('updateAllJobStats error getting list job details:', err);
      msgs.error('Job details could not be retrieved');
      msgs.error('', err);
      deferred.reject({ jobs, err });
    }

    return deferred.promise;
  };

  this.getRunningJobs = function () {
    const runningJobs = [];
    _.each(jobs, (job) => {
      if (job.datafeed_config && job.datafeed_config.state === 'started') {
        runningJobs.push(job);
      }
    });
    return runningJobs;
  };

  this.updateSingleJobDatafeedState = function (jobId) {
    const deferred = $q.defer();

    const datafeedId = this.getDatafeedId(jobId);

    ml.datafeedStats({ datafeedId })
      .then((resp) => {
      // console.log('updateSingleJobCounts controller query response:', resp);
        const datafeeds = resp.datafeeds;
        let state = 'UNKNOWN';
        if (datafeeds && datafeeds.length) {
          state = datafeeds[0].state;
        }
        deferred.resolve(state);
      })
      .catch((resp) => {
        deferred.reject(resp);
      });

    return deferred.promise;
  };

  this.saveNewJob = function (job) {
    // run then and catch through the same check
    const func = function (resp) {
      console.log('Response for job query:', resp);
      const success = checkSaveResponse(resp, job);
      return { success, job, resp };
    };

    // return the promise chain
    return ml.addJob({ jobId: job.job_id, job })
      .then(func).catch(func);
  };

  this.deleteJob = function (job, statusIn) {
    const deferred = $q.defer();
    const status = statusIn || { deleteDatafeed: 0, deleteJob: 0, errorMessage: '' };

    // chain of endpoint calls to delete a job.
    // if job is datafeed, stop and delete datafeed first
    if (job.datafeed_config && Object.keys(job.datafeed_config).length) {
      const datafeedId = this.getDatafeedId(job.job_id);
      // stop datafeed
      ml.forceDeleteDatafeed({ datafeedId: datafeedId })
        .then(() => {
          status.deleteDatafeed = 1;
          deleteJob();
        })
        .catch((resp) => {
          status.deleteDatafeed = -1;
          status.deleteJob = -1;
          deleteFailed(resp, 'Delete datafeed');
        });
    } else {
      deleteJob();
    }

    function deleteJob() {
      ml.forceDeleteJob({ jobId: job.job_id })
        .then(() => {
          status.deleteJob = 1;
          deferred.resolve({ success: true });
        })
        .catch((resp) => {
          status.deleteJob = -1;
          deleteFailed(resp, 'Delete job');
        });
    }

    function deleteFailed(resp, txt) {
      if (resp.statusCode === 500) {
        status.errorMessage = txt;
      }
      deferred.reject({ success: false });
    }

    return deferred.promise;
  };

  this.cloneJob = function (job) {
    // create a deep copy of a job object
    // also remove items from the job which are set by the server and not needed
    // in the future this formatting could be optional
    const tempJob = angular.copy(job);

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

    delete tempJob.analysis_config.use_per_partition_normalization;

    _.each(tempJob.analysis_config.detectors, (d) => {
      delete d.detector_index;
    });

    // remove parts of the datafeed config which should not be copied
    if (tempJob.datafeed_config) {
      delete tempJob.datafeed_config.datafeed_id;
      delete tempJob.datafeed_config.job_id;
      delete tempJob.datafeed_config.state;
      delete tempJob.datafeed_config.node;

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

    return tempJob;
  };

  this.updateJob = function (jobId, job) {
    // return the promise chain
    return ml.updateJob({ jobId, job })
      .then((resp) => {
        console.log('update job', resp);
        return { success: true };
      }).catch((err) => {
        msgs.error('Could not update job: ' + jobId);
        console.log('update job', err);
        return { success: false, message: err.message };
      });
  };

  this.validateJob = function (obj) {
    // return the promise chain
    return ml.validateJob(obj)
      .then((messages) => {
        console.log('validate job', messages);
        return { success: true, messages };
      }).catch((err) => {
        msgs.error('Job Validation Error: ' + err.message);
        console.log('validate job', err);
        return {
          success: false,
          messages: [{
            status: 'error',
            text: err.message
          }]
        };
      });
  };

  // find a job based on the id
  this.getJob = function (jobId) {
    const job = _.find(jobs, (j) => {
      return j.job_id === jobId;
    });

    return job;
  };

  // use elasticsearch to load basic information on jobs, as used by various result
  // dashboards in the Ml plugin. Returned response contains a jobs property,
  // which is an array of objects containing id, description, bucketSpanSeconds, detectors
  // and detectorDescriptions properties, plus a customUrls key if custom URLs
  // have been configured for the job.
  this.getBasicJobInfo = function () {
    const deferred = $q.defer();
    const obj = { success: true, jobs: [] };

    ml.jobs()
      .then((resp) => {
        if (resp.jobs && resp.jobs.length > 0) {
          obj.jobs = processBasicJobInfo(this, resp.jobs);
        }
        deferred.resolve(obj);
      })
      .catch((resp) => {
        console.log('getBasicJobInfo error getting list of jobs:', resp);
        deferred.reject(resp);
      });

    return deferred.promise;
  };

  // Obtains the list of fields by which record level results may be viewed for all
  // the jobs that have been created. Essentially this is the list of unique 'by',
  // 'over' and 'partition' fields that have been defined across all the detectors for
  // a job, although for detectors with both 'by' and 'over' fields, the 'by' field name
  // is not returned since this field is not added to the top-level record fields.
  // Returned response contains a fieldsByJob property, with job ID keys
  // against an array of the field names by which record type results may be viewed
  // for that job.
  // Contains an addition '*' key which holds an array of the
  // unique fields across all jobs.
  this.getJobViewByFields = function () {
    const deferred = $q.defer();
    const obj = { success: true, fieldsByJob: { '*': [] } };

    ml.jobs()
      .then(function (resp) {
        if (resp.jobs && resp.jobs.length > 0) {
          _.each(resp.jobs, (jobObj) => {
            // Add the list of distinct by, over and partition fields for each job.
            const fieldsForJob = [];

            const analysisConfig = jobObj.analysis_config;
            const detectors = analysisConfig.detectors || [];
            _.each(detectors, (detector) => {
              if (_.has(detector, 'partition_field_name')) {
                fieldsForJob.push(detector.partition_field_name);
              }
              if (_.has(detector, 'over_field_name')) {
                fieldsForJob.push(detector.over_field_name);
              }
              // For jobs with by and over fields, don't add the 'by' field as this
              // field will only be added to the top-level fields for record type results
              // if it also an influencer over the bucket.
              if (_.has(detector, 'by_field_name') && !(_.has(detector, 'over_field_name'))) {
                fieldsForJob.push(detector.by_field_name);
              }
            });

            obj.fieldsByJob[jobObj.job_id] = _.uniq(fieldsForJob);
            obj.fieldsByJob['*'] = _.union(obj.fieldsByJob['*'], obj.fieldsByJob[jobObj.job_id]);
          });

          // Sort fields alphabetically.
          _.each(obj.fieldsByJob, (fields, jobId)=> {
            obj.fieldsByJob[jobId] = _.sortBy(fields, (field) => {
              return field.toLowerCase();
            });
          });
        }

        deferred.resolve(obj);

      })
      .catch((resp) => {
        console.log('getJobViewByFields error getting list of viewBy fields:', resp);
        deferred.reject(resp);
      });

    return deferred.promise;
  };

  // search to load a few records to extract the time field
  this.searchTimeFields = function (index, type, field) {
    const deferred = $q.defer();
    const obj = { time: '' };

    es.search({
      method: 'GET',
      index: index,
      type: type,
      size: 1,
      _source: field,
    })
      .then((resp) => {
        if (resp.hits.total !== 0 && resp.hits.hits.length) {
          const hit = resp.hits.hits[0];
          if (hit._source && hit._source[field]) {
            obj.time = hit._source[field];
          }
        }
        deferred.resolve(obj);
      })
      .catch((resp) => {
        deferred.reject(resp);
      });
    return deferred.promise;
  };

  this.searchPreview = function (job) {
    const deferred = $q.defer();

    if (job.datafeed_config) {

      // if query is set, add it to the search, otherwise use match_all
      let query = { 'match_all': {} };
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
      const fieldsService = Private(FieldsServiceProvider);
      fieldsService.getTimeFieldRange(
        job.datafeed_config.indices,
        job.data_description.time_field,
        query)
        .then((timeRange) => {
          const bucketSpan = parseInterval(job.analysis_config.bucket_span);
          const earliestMs = timeRange.start.epoch;
          const latestMs = +timeRange.start.epoch + (10 * bucketSpan.asMilliseconds());

          const body = {
            query: {
              bool: {
                must: [
                  {
                    range: {
                      [job.data_description.time_field]: {
                        gte: earliestMs,
                        lt: latestMs,
                        format: 'epoch_millis'
                      }
                    }
                  },
                  query
                ]
              }
            }
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
              _.each(job.analysis_config.detectors, (dtr) => {
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
              _.each(job.analysis_config.influencers, (inf) => {
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

            // console.log('fields: ', fields);
            const fieldsList = Object.keys(fields);
            if (fieldsList.length) {
              body._source = fieldsList;
            }
          }

          const data = {
            index: job.datafeed_config.indices,
            body
          };

          es.search(data)
            .then((resp) => {
              deferred.resolve(resp);
            })
            .catch((resp) => {
              deferred.reject(resp);
            });


        })
        .catch((resp) => {
          deferred.reject(resp);
        });


    }

    return deferred.promise;
  };

  this.openJob = function (jobId) {
    return ml.openJob({ jobId });
  };

  this.closeJob = function (jobId) {
    return ml.closeJob({ jobId });
  };

  this.forceCloseJob = function (jobId) {
    return ml.forceCloseJob({ jobId });
  };


  this.saveNewDatafeed = function (datafeedConfig, jobId) {
    const datafeedId = 'datafeed-' + jobId;
    datafeedConfig.job_id = jobId;

    return ml.addDatafeed({
      datafeedId,
      datafeedConfig
    });
  };

  this.updateDatafeed = function (datafeedId, datafeedConfig) {
    return ml.updateDatafeed({ datafeedId, datafeedConfig })
      .then((resp) => {
        console.log('update datafeed', resp);
        return { success: true };
      }).catch((err) => {
        msgs.error('Could not update datafeed: ' + datafeedId);
        console.log('update datafeed', err);
        return { success: false, message: err.message };
      });
  };

  this.deleteDatafeed = function () {

  };

  // start the datafeed for a given job
  // refresh the job state on start success
  this.startDatafeed = function (datafeedId, jobId, start, end) {
    const deferred = $q.defer();

    // if the end timestamp is a number, add one ms to it to make it
    // inclusive of the end of the data
    if (_.isNumber(end)) {
      end++;
    }

    ml.startDatafeed({
      datafeedId,
      start,
      end
    })
      .then((resp) => {
        deferred.resolve(resp);

      }).catch((err) => {
        console.log('MlJobsList error starting datafeed:', err);
        msgs.error('Could not start datafeed for ' + jobId, err);
        deferred.reject(err);
      });
    return deferred.promise;
  };

  // stop the datafeed for a given job
  // refresh the job state on stop success
  this.stopDatafeed = function (datafeedId, jobId) {
    const deferred = $q.defer();
    ml.stopDatafeed({
      datafeedId
    })
      .then((resp) => {
        deferred.resolve(resp);

      }).catch((err) => {
        console.log('MlJobsList error stopping datafeed:', err);
        if (err.statusCode === 500) {
          msgs.error('Could not stop datafeed for ' + jobId);
          msgs.error('Request may have timed out and may still be running in the background.');
        } else {
          msgs.error('Could not stop datafeed for ' + jobId, err);
        }
        deferred.reject(err);
      });
    return deferred.promise;
  };

  this.validateDetector = function (detector) {
    const deferred = $q.defer();
    if (detector) {
      ml.validateDetector({ detector })
        .then((resp) => {
          deferred.resolve(resp);
        })
        .catch((resp) => {
          deferred.reject(resp);
        });
    } else {
      deferred.reject({});
    }
    return deferred.promise;
  };

  this.getDatafeedId = function (jobId) {
    let datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      datafeedId = 'datafeed-' + jobId;
    }
    return datafeedId;
  };

  this.getDatafeedPreview = function (jobId) {
    const datafeedId = this.getDatafeedId(jobId);
    return ml.datafeedPreview({ datafeedId });
  };

  function processBasicJobInfo(mlJobService, jobsList) {
    // Process the list of job data obtained from the jobs endpoint to return
    // an array of objects containing the basic information (id, description, bucketSpan, detectors
    // and detectorDescriptions properties, plus a customUrls key if custom URLs
    // have been configured for the job) used by various result dashboards in the ml plugin.
    // The key information is stored in the mlJobService object for quick access.
    const processedJobsList = [];
    let detectorDescriptionsByJob = {};
    const detectorsByJob = {};
    const customUrlsByJob = {};

    // use cloned copy of jobs list so not to alter the original
    const jobsListCopy = _.cloneDeep(jobsList);

    _.each(jobsListCopy, (jobObj) => {
      const analysisConfig = jobObj.analysis_config;
      const bucketSpan = parseInterval(analysisConfig.bucket_span);

      const job = {
        id: jobObj.job_id,
        bucketSpanSeconds: bucketSpan.asSeconds()
      };

      if (_.has(jobObj, 'description') && /^\s*$/.test(jobObj.description) === false) {
        job.description = jobObj.description;
      } else {
        // Just use the id as the description.
        job.description = jobObj.job_id;
      }

      job.detectorDescriptions = [];
      job.detectors = [];
      const detectors = _.get(analysisConfig, 'detectors', []);
      _.each(detectors, (detector)=> {
        if (_.has(detector, 'detector_description')) {
          job.detectorDescriptions.push(detector.detector_description);
          job.detectors.push(detector);
        }
      });


      if (_.has(jobObj, 'custom_settings.custom_urls')) {
        job.customUrls = [];
        _.each(jobObj.custom_settings.custom_urls, (url) => {
          if (_.has(url, 'url_name') && _.has(url, 'url_value') && isWebUrl(url.url_value)) {
            // Only make web URLs (i.e. http or https) available in dashboard drilldowns.
            job.customUrls.push(url);
          }
        });
        // Only add an entry for a job if customUrls have been defined.
        if (job.customUrls.length > 0) {
          customUrlsByJob[job.id] = job.customUrls;
        }
      }

      mlJobService.jobDescriptions[job.id] = job.description;
      detectorDescriptionsByJob[job.id] = job.detectorDescriptions;
      detectorsByJob[job.id] = job.detectors;
      mlJobService.basicJobs[job.id] = job;
      processedJobsList.push(job);
    });

    detectorDescriptionsByJob = labelDuplicateDetectorDescriptions(detectorDescriptionsByJob);
    _.each(detectorsByJob, (dtrs, jobId) => {
      _.each(dtrs, (dtr, i) => {
        dtr.detector_description = detectorDescriptionsByJob[jobId][i];
      });
    });
    mlJobService.detectorsByJob = detectorsByJob;
    mlJobService.customUrlsByJob = customUrlsByJob;

    return processedJobsList;
  }

  // Loop through the jobs list and create basic stats
  // stats are displayed along the top of the Jobs Management page
  function createJobStats(jobsList, jobStats) {

    jobStats.activeNodes.value = 0;
    jobStats.total.value = 0;
    jobStats.open.value = 0;
    jobStats.closed.value = 0;
    jobStats.failed.value = 0;
    jobStats.activeDatafeeds.value = 0;

    // object to keep track of nodes being used by jobs
    const mlNodes = {};
    let failedJobs = 0;

    _.each(jobsList, (job) => {
      if (job.state === 'opened') {
        jobStats.open.value++;
      } else if (job.state === 'closed') {
        jobStats.closed.value++;
      } else if (job.state === 'failed') {
        failedJobs++;
      }

      if (job.datafeed_config && job.datafeed_config.state === 'started') {
        jobStats.activeDatafeeds.value++;
      }

      if (job.node && job.node.name) {
        mlNodes[job.node.name] = {};
      }
    });

    jobStats.total.value = jobsList.length;

    // // Only show failed jobs if it is non-zero
    if (failedJobs) {
      jobStats.failed.value = failedJobs;
      jobStats.failed.show = true;
    } else {
      jobStats.failed.show = false;
    }

    jobStats.activeNodes.value = Object.keys(mlNodes).length;
  }

  function createJobUrls(jobsList, jobUrls) {
    _.each(jobsList, (job) => {
      if (job.data_counts) {
        const from = moment(job.data_counts.earliest_record_timestamp).toISOString();
        const to = moment(job.data_counts.latest_record_timestamp).toISOString();
        let path = `?_g=(ml:(jobIds:!('${job.job_id}'))`;
        path += `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${from}'`;
        path += `,mode:absolute,to:'${to}'`;
        path += '))&_a=(filters:!(),query:(query_string:(analyze_wildcard:!t,query:\'*\')))';

        if (jobUrls[job.job_id]) {
          jobUrls[job.job_id].url = path;
        } else {
          jobUrls[job.job_id] = { url: path };
        }
      }
    });
  }

  // get the list of job group ids as well as how many jobs are in each group
  this.getJobGroups = function () {
    const groups = [];
    const tempGroups = {};
    this.jobs.forEach(job => {
      if (Array.isArray(job.groups)) {
        job.groups.forEach(group => {
          if (tempGroups[group] === undefined) {
            tempGroups[group] = [job];
          } else {
            tempGroups[group].push(job);
          }
        });
      }
    });
    _.each(tempGroups, (js, id) => {
      groups.push({ id, jobs: js });
    });
    return groups;
  };

});
