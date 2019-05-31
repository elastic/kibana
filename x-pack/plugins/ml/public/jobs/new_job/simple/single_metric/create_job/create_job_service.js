/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import { parseInterval } from 'ui/utils/parse_interval';

import { ML_MEDIAN_PERCENTS } from 'plugins/ml/../common/util/job_utils';
import { WIZARD_TYPE } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { calculateTextWidth } from 'plugins/ml/util/string_utils';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { createJobForSaving } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { ml } from 'plugins/ml/services/ml_api_service';

export function SingleMetricJobServiceProvider() {

  class SingleMetricJobService {

    constructor() {
      this.chartData = {
        line: [],
        model: [],
        swimlane: [],
        hasBounds: false,
        percentComplete: 0,
        highestValue: 0,
        chartTicksMargin: { width: 30 },
        totalResults: 0
      };
      this.job = {};
    }

    getLineChartResults(formConfig) {
      return new Promise((resolve, reject) => {

        this.chartData.line = [];
        this.chartData.model = [];
        this.chartData.swimlane = [];
        this.chartData.hasBounds = false;
        this.chartData.percentComplete = 0;
        this.chartData.loadingDifference = 0;
        this.chartData.eventRateHighestValue = 0;
        this.chartData.totalResults = 0;

        const aggType = formConfig.agg.type.dslName;
        if (formConfig.field && formConfig.field.id) {
          this.chartData.fieldFormat = mlFieldFormatService.getFieldFormatFromIndexPattern(
            formConfig.indexPattern,
            formConfig.field.id,
            aggType);
        } else {
          delete this.chartData.fieldFormat;
        }

        const obj = {
          success: true,
          results: {}
        };

        const searchJson = getSearchJsonFromConfig(formConfig);

        ml.esSearch(searchJson)
          .then((resp) => {

            const aggregationsByTime = _.get(resp, ['aggregations', 'times', 'buckets'], []);
            let highestValue;
            let lowestValue;

            _.each(aggregationsByTime, (dataForTime) => {
              const time = dataForTime.key;
              let value = _.get(dataForTime, ['field_value', 'value']);

              if (value === undefined && formConfig.field !== null) {
                value = _.get(dataForTime, ['field_value', 'values', ML_MEDIAN_PERCENTS]);
              }

              if (value === undefined && formConfig.field === null) {
                value = dataForTime.doc_count;
              }
              if (!isFinite(value) || dataForTime.doc_count === 0) {
                value = null;
              }

              if (value !== null) {
                highestValue = (highestValue === undefined) ? value : Math.max(value, highestValue);
                lowestValue = (lowestValue === undefined) ? value : Math.min(value, lowestValue);
              }

              obj.results[time] = {
                actual: value,
              };
            });

            this.chartData.totalResults = resp.hits.total;
            this.chartData.line = processLineChartResults(obj.results);

            // Calculate the width required for the chart ticks margin,
            // which is the larger of the minimum or maximum value when formatted
            lowestValue = (lowestValue === undefined) ? 0 : lowestValue;
            highestValue = (highestValue === undefined) ? 1 : highestValue;

            // For small ranges e.g 0.15 to 0.55 don't floor/ceil values as
            // the resulting ints would require less width when rendering
            const valueRange = highestValue - lowestValue;
            if (valueRange > 1) {
              lowestValue = Math.floor(lowestValue);
              this.chartData.highestValue = Math.ceil(highestValue);
            } else {

              this.chartData.highestValue = highestValue;
            }

            let lowValueWidth = 0;
            let highValueWidth = 0;
            if (this.chartData.fieldFormat !== undefined) {
              const lowValueFormatted = this.chartData.fieldFormat.convert(lowestValue, 'text');
              const highValueFormatted = this.chartData.fieldFormat.convert(this.chartData.highestValue, 'text');
              lowValueWidth = calculateTextWidth(lowValueFormatted, false);
              highValueWidth = calculateTextWidth(highValueFormatted, false);
            } else {
              lowValueWidth = calculateTextWidth(lowestValue, true);
              highValueWidth = calculateTextWidth(this.chartData.highestValue, true);
            }

            // Append extra 10px to width of tick label for widest axis value to allow for tick padding.
            this.chartData.chartTicksMargin.width = Math.max(lowValueWidth, highValueWidth) + 10;

            resolve(this.chartData);
          })
          .catch((resp) => {
            reject(resp);
          });

      });
    }

    getJobFromConfig(formConfig) {
      const job = mlJobService.getBlankJob();
      job.data_description.time_field = formConfig.timeField;

      let func = formConfig.agg.type.mlName;
      if (formConfig.isSparseData) {
        if (formConfig.agg.type.dslName === 'count') {
          func = func.replace(/count/, 'non_zero_count');
        } else if(formConfig.agg.type.dslName === 'sum') {
          func = func.replace(/sum/, 'non_null_sum');
        }
      }
      const dtr = {
        function: func
      };

      const query = formConfig.combinedQuery;

      if (formConfig.field && formConfig.field.id) {
        dtr.field_name = formConfig.field.id;
      }
      job.analysis_config.detectors.push(dtr);
      job.analysis_config.bucket_span = formConfig.bucketSpan;

      job.analysis_limits = {
        model_memory_limit: formConfig.modelMemoryLimit
      };

      delete job.data_description.field_delimiter;
      delete job.data_description.quote_character;
      delete job.data_description.time_format;
      delete job.data_description.format;

      const bucketSpanSeconds = parseInterval(formConfig.bucketSpan).asSeconds();

      const indices = formConfig.indexPattern.title.split(',').map(i => i.trim());
      job.datafeed_config = {
        query,
        indices,
      };

      job.job_id = formConfig.jobId;
      job.description = formConfig.description;
      job.groups = formConfig.jobGroups;

      job.model_plot_config =  {
        enabled: true
      };

      if (formConfig.useDedicatedIndex) {
        job.results_index_name = job.job_id;
      }

      if (formConfig.usesSavedSearch === false) {
        // Jobs created from saved searches cannot be cloned in the wizard as the
        // ML job config holds no reference to the saved search ID.
        job.custom_settings = {
          created_by: WIZARD_TYPE.SINGLE_METRIC
        };
      }

      // Use the original es agg type rather than the ML version
      // e.g. count rather than high_count
      const aggType = formConfig.agg.type.dslName;
      const interval = bucketSpanSeconds * 1000;
      switch (aggType) {
        case 'count':
          job.analysis_config.summary_count_field_name = 'doc_count';

          job.datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: formConfig.timeField,
                fixed_interval: `${interval}ms`
              },
              aggregations: {
                [formConfig.timeField]: {
                  max: {
                    field: formConfig.timeField
                  }
                }
              }
            }
          };
          break;
        case 'avg':
        case 'median':
        case 'sum':
        case 'min':
        case 'max':
          job.analysis_config.summary_count_field_name = 'doc_count';

          job.datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: formConfig.timeField,
                fixed_interval: `${((interval / 100) * 10)}ms` // use 10% of bucketSpan to allow for better sampling
              },
              aggregations: {
                [dtr.field_name]: {
                  [aggType]: {
                    field: formConfig.field.name
                  }
                },
                [formConfig.timeField]: {
                  max: {
                    field: formConfig.timeField
                  }
                }
              }
            }
          };
          break;
        case 'cardinality':
          job.analysis_config.summary_count_field_name = 'dc_' + dtr.field_name;

          job.datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: formConfig.timeField,
                fixed_interval: `${interval}ms`
              },
              aggregations: {
                [formConfig.timeField]: {
                  max: {
                    field: formConfig.timeField
                  }
                },
                [job.analysis_config.summary_count_field_name]: {
                  [aggType]: {
                    field: formConfig.field.name
                  }
                }
              }
            }
          };

          // finally, modify the detector before saving
          dtr.function = 'non_zero_count';
          // add a description using the original function name rather 'non_zero_count'
          // as the user may not be aware it's been changed
          dtr.detector_description = `${func} (${dtr.field_name})`;
          delete dtr.field_name;

          break;
        default:
          break;
      }

      return job;
    }

    createJob(formConfig) {
      return new Promise((resolve, reject) => {

        this.job = this.getJobFromConfig(formConfig);
        const job = createJobForSaving(this.job);

        // DO THE SAVE
        mlJobService.saveNewJob(job)
          .then((resp) => {
            if (resp.success) {
              resolve(this.job);
            } else {
              reject(resp);
            }
          });

      });
    }

    startDatafeed(formConfig) {
      const datafeedId = mlJobService.getDatafeedId(formConfig.jobId);
      return mlJobService.startDatafeed(datafeedId, formConfig.jobId, formConfig.start, formConfig.end);
    }

    stopDatafeed(formConfig) {
      const datafeedId = mlJobService.getDatafeedId(formConfig.jobId);
      return mlJobService.stopDatafeed(datafeedId, formConfig.jobId);
    }

    checkDatafeedState(formConfig) {
      return mlJobService.updateSingleJobDatafeedState(formConfig.jobId);
    }

    loadModelData(formConfig) {
      return new Promise((resolve, reject) => {

        let start = formConfig.start;

        if (this.chartData.model.length > 5) {
          // only load the model since the end of the last time we checked
          // but discard the last 5 buckets in case the model has changed
          start = this.chartData.model[this.chartData.model.length - 5].time;
          for (let i = 0; i < 5; i++) {
            this.chartData.model.pop();
          }
        }

        // Obtain the model plot data, passing 0 for the detectorIndex and empty list of partitioning fields.
        mlResultsService.getModelPlotOutput(
          formConfig.jobId,
          0,
          [],
          start,
          formConfig.end,
          formConfig.resultsIntervalSeconds + 's',
          formConfig.agg.type.mlModelPlotAgg
        )
          .then(data => {
          // for count, scale the model upper and lower by the
          // ratio of chart interval to bucketspan.
          // this will force the model bounds to be drawn in the correct location
            let scale = 1;
            if (formConfig &&
            (formConfig.agg.type.mlName === 'count' ||
            formConfig.agg.type.mlName === 'high_count' ||
            formConfig.agg.type.mlName === 'low_count' ||
            formConfig.agg.type.mlName === 'distinct_count')) {
              const chartIntervalSeconds = formConfig.chartInterval.getInterval().asSeconds();
              const bucketSpan = parseInterval(formConfig.bucketSpan);
              if (bucketSpan !== null) {
                scale =  chartIntervalSeconds / bucketSpan.asSeconds();
              }
            }

            this.chartData.model = this.chartData.model.concat(processLineChartResults(data.results, scale));

            const lastBucket = this.chartData.model[this.chartData.model.length - 1];
            const time = (lastBucket !== undefined) ? lastBucket.time : formConfig.start;

            const pcnt = ((time -  formConfig.start + formConfig.resultsIntervalSeconds) / (formConfig.end - formConfig.start) * 100);
            this.chartData.percentComplete = Math.round(pcnt);

            resolve(this.chartData);
          })
          .catch(() => {
            reject(this.chartData);
          });

      });
    }

    loadSwimlaneData(formConfig) {
      return new Promise((resolve) => {

        mlResultsService.getScoresByBucket(
          [formConfig.jobId],
          formConfig.start,
          formConfig.end,
          formConfig.resultsIntervalSeconds + 's',
          1
        )
          .then((data) => {
            const jobResults = data.results[formConfig.jobId];
            this.chartData.swimlane = processSwimlaneResults(jobResults);
            this.chartData.swimlaneInterval = formConfig.resultsIntervalSeconds * 1000;
            resolve(this.chartData);
          })
          .catch(() => {
            resolve(this.chartData);
          });

      });
    }
  }

  return new SingleMetricJobService();
}

function processLineChartResults(data, scale = 1) {
  const lineData = [];
  _.each(data, (dataForTime, t) => {
    const time = +t;
    const date = new Date(time);
    lineData.push({
      date: date,
      time: time,
      lower: (dataForTime.modelLower * scale),
      value: dataForTime.actual,
      upper: (dataForTime.modelUpper * scale)
    });
  });

  return _.sortBy(lineData, 'time');
}

function processSwimlaneResults(bucketScoreData, init) {
  // create a dataset in format used by the model plot chart.
  // create empty swimlane dataset
  // i.e. array of Objects with keys date (JavaScript date), value, lower and upper.
  const swimlaneData = [];
  _.each(bucketScoreData, (value, t) => {
    const time = +t;
    const date = new Date(time);
    value = init ? 0 : value;
    swimlaneData.push({
      date,
      time,
      value,
      color: ''
    });
  });
  return swimlaneData;
}

function getSearchJsonFromConfig(formConfig) {
  const interval = formConfig.chartInterval.getInterval().asMilliseconds() + 'ms';
  // clone the query as we're modifying it
  const query = _.cloneDeep(formConfig.combinedQuery);

  const json = {
    index: formConfig.indexPattern.title,
    size: 0,
    rest_total_hits_as_int: true,
    body: {
      query: {},
      aggs: {
        times: {
          date_histogram: {
            field: formConfig.timeField,
            interval: interval,
            min_doc_count: 0,
            extended_bounds: {
              min: formConfig.start,
              max: formConfig.end,
            }
          }
        }
      }
    }
  };

  query.bool.must.push({
    range: {
      [formConfig.timeField]: {
        gte: formConfig.start,
        lte: formConfig.end,
        format: formConfig.format
      }
    }
  });

  json.body.query = query;

  if (formConfig.field !== null) {
    json.body.aggs.times.aggs = {
      field_value: {
        [formConfig.agg.type.dslName]: { field: formConfig.field.name }
      }
    };
  }

  return json;
}
