/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import angular from 'angular';

import { EVENT_RATE_COUNT_FIELD } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { ML_MEDIAN_PERCENTS } from 'plugins/ml/../common/util/job_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlMultiMetricJobService', function (
  $q,
  es,
  timefilter,
  Private,
  mlFieldFormatService,
  mlJobService) {

  this.chartData = {
    job: {
      swimlane: [],
      line: [],
      bars: [],
      earliestTime: Number.MAX_SAFE_INTEGER
    },
    detectors: {},
    percentComplete: 0,
    loadingDifference: 0,
    lastLoadTimestamp: null,
    eventRateHighestValue: 0,
    chartTicksMargin: { width: 30 },
    totalResults: 0
  };
  this.job = {};

  this.clearChartData = function () {
    this.chartData.job.swimlane = [];
    this.chartData.job.line = [];
    this.chartData.job.bars = [];
    this.chartData.detectors = {};
    this.chartData.percentComplete = 0;
    this.chartData.loadingDifference = 0;
    this.chartData.eventRateHighestValue = 0;
    this.chartData.totalResults = 0;

    this.job = {};
  };

  this.getLineChartResults = function (formConfig, thisLoadTimestamp) {
    const deferred = $q.defer();

    const fieldIds = Object.keys(formConfig.fields).sort();

    this.chartData.job.earliestTime = formConfig.start;

    // move event rate field to the front of the list
    const idx = _.findIndex(fieldIds, (id) => id === EVENT_RATE_COUNT_FIELD);
    if(idx !== -1) {
      fieldIds.splice(idx, 1);
      fieldIds.splice(0, 0, EVENT_RATE_COUNT_FIELD);
    }

    _.each(fieldIds, (fieldId) => {
      this.chartData.detectors[fieldId] = {
        line: [],
        swimlane: [],
        highestValue: 0
      };
    });

    const searchJson = getSearchJsonFromConfig(formConfig);

    es.search(searchJson)
      .then((resp) => {
      // if this is the last chart load, wipe all previous chart data
        if (thisLoadTimestamp === this.chartData.lastLoadTimestamp) {
          _.each(fieldIds, (fieldId) => {
            this.chartData.detectors[fieldId] = {
              line: [],
              swimlane: [],
              highestValue: 0
            };

            if (fieldId !== EVENT_RATE_COUNT_FIELD) {
              const field = formConfig.fields[fieldId];
              const aggType = field.agg.type.dslName;
              this.chartData.detectors[fieldId].fieldFormat = mlFieldFormatService.getFieldFormatFromIndexPattern(
                formConfig.indexPattern,
                fieldId,
                aggType);
            }

          });
        } else {
          deferred.resolve(this.chartData);
        }
        const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);

        _.each(aggregationsByTime, (dataForTime) => {
          const time = +dataForTime.key;
          const date = new Date(time);
          const docCount = +dataForTime.doc_count;

          this.chartData.job.swimlane.push({
            date: date,
            time: time,
            value: 0,
            color: '',
            percentComplete: 0
          });
          this.chartData.job.earliestTime = (time < this.chartData.job.earliestTime) ? time : this.chartData.job.earliestTime;

          // used to draw the x axis labels on first render
          this.chartData.job.line.push({
            date: date,
            time: time,
            value: null,
          });

          _.each(fieldIds, (fieldId) => {
            let value;
            if (fieldId === EVENT_RATE_COUNT_FIELD) {
              value = docCount;
            } else if (typeof dataForTime[fieldId].value !== 'undefined') {
              value = dataForTime[fieldId].value;
            } else if (typeof dataForTime[fieldId].values !== 'undefined') {
              value = dataForTime[fieldId].values[ML_MEDIAN_PERCENTS];
            }

            if (!isFinite(value) || docCount === 0) {
              value = null;
            }

            if (this.chartData.detectors[fieldId]) {
              this.chartData.detectors[fieldId].line.push({
                date,
                time,
                value,
              });

              // init swimlane
              this.chartData.detectors[fieldId].swimlane.push({
                date,
                time,
                value: 0,
                color: '',
                percentComplete: 0
              });

              if (value !== null) {
                this.chartData.detectors[fieldId].highestValue =
                  Math.ceil(Math.max(this.chartData.detectors[fieldId].highestValue, Math.abs(value)));
              }

            }
          });
        });

        deferred.resolve(this.chartData);
      })
      .catch((resp) => {
        deferred.reject(resp);
      });

    return deferred.promise;
  };

  function getSearchJsonFromConfig(formConfig) {
    const interval = formConfig.chartInterval.getInterval().asMilliseconds() + 'ms';
    // clone the query as we're modifying it
    const query = _.cloneDeep(formConfig.combinedQuery);

    const json = {
      'index': formConfig.indexPattern.title,
      'size': 0,
      'body': {
        'query': {},
        'aggs': {
          'times': {
            'date_histogram': {
              'field': formConfig.timeField,
              'interval': interval,
              'min_doc_count': 0,
              'extended_bounds': {
                'min': formConfig.start,
                'max': formConfig.end,
              }
            }
          }
        }
      }
    };

    query.bool.must.push({
      'range': {
        [formConfig.timeField]: {
          'gte': formConfig.start,
          'lte': formConfig.end,
          'format': formConfig.format
        }
      }
    });

    // if the data is partitioned, add an additional search term
    if (formConfig.firstSplitFieldName !== undefined) {
      query.bool.must.push({
        term: {
          [formConfig.splitField.name]: formConfig.firstSplitFieldName
        }
      });
    }

    json.body.query = query;

    if (Object.keys(formConfig.fields).length) {
      json.body.aggs.times.aggs = {};
      _.each(formConfig.fields, (field) => {
        if (field.id !== EVENT_RATE_COUNT_FIELD) {
          json.body.aggs.times.aggs[field.id] = {
            [field.agg.type.dslName]: { field: field.name }
          };

          if (field.agg.type.dslName === 'percentiles') {
            json.body.aggs.times.aggs[field.id][field.agg.type.dslName].percents = [ML_MEDIAN_PERCENTS];
          }
        }
      });
    }

    return json;
  }

  function createJobForSaving(job) {
    const newJob = angular.copy(job);
    delete newJob.datafeed_config;
    return newJob;
  }

  this.getJobFromConfig = function (formConfig) {
    const job = mlJobService.getBlankJob();
    job.data_description.time_field = formConfig.timeField;

    _.each(formConfig.fields, (field, key) => {
      let func = field.agg.type.mlName;
      if (formConfig.isSparseData) {
        if (field.agg.type.dslName === 'count') {
          func = func.replace(/count/, 'non_zero_count');
        } else if(field.agg.type.dslName === 'sum') {
          func = func.replace(/sum/, 'non_null_sum');
        }
      }
      const dtr = {
        function: func
      };

      dtr.detector_description = func;

      if (key !== EVENT_RATE_COUNT_FIELD) {
        dtr.field_name = field.name;
        dtr.detector_description += `(${field.name})`;
      }

      if (formConfig.splitField !== undefined) {
        dtr.partition_field_name =  formConfig.splitField.name;
      }
      job.analysis_config.detectors.push(dtr);
    });

    const influencerFields = formConfig.influencerFields.map(f => f.name);
    if (influencerFields && influencerFields.length) {
      job.analysis_config.influencers = influencerFields;
    }

    let query = {
      match_all: {}
    };
    if (formConfig.query.query_string.query !== '*' || formConfig.filters.length) {
      query = formConfig.combinedQuery;
    }

    job.analysis_config.bucket_span = formConfig.bucketSpan;

    job.analysis_limits = {
      model_memory_limit: formConfig.modelMemoryLimit
    };

    delete job.data_description.field_delimiter;
    delete job.data_description.quote_character;
    delete job.data_description.time_format;
    delete job.data_description.format;

    const indices = formConfig.indexPattern.title.split(',').map(i => i.trim());

    job.datafeed_config = {
      query,
      indices
    };

    job.job_id = formConfig.jobId;
    job.description = formConfig.description;
    job.groups = formConfig.jobGroups;

    if (formConfig.useDedicatedIndex) {
      job.results_index_name = job.job_id;
    }

    return job;
  };

  this.createJob = function (formConfig) {
    const deferred = $q.defer();

    this.job = this.getJobFromConfig(formConfig);
    const job = createJobForSaving(this.job);

    // DO THE SAVE
    mlJobService.saveNewJob(job)
      .then((resp) => {
        if (resp.success) {
          deferred.resolve(this.job);
        } else {
          deferred.reject(resp);
        }
      });

    return deferred.promise;
  };

  this.startDatafeed = function (formConfig) {
    const datafeedId = mlJobService.getDatafeedId(formConfig.jobId);
    return mlJobService.startDatafeed(datafeedId, formConfig.jobId, formConfig.start, formConfig.end);
  };

  this.stopDatafeed = function (formConfig) {
    const datafeedId = mlJobService.getDatafeedId(formConfig.jobId);
    return mlJobService.stopDatafeed(datafeedId, formConfig.jobId);
  };

});
