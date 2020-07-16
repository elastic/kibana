/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import semver from 'semver';
import moment, { Duration } from 'moment';
// @ts-ignore
import numeral from '@elastic/numeral';

import { ALLOWED_DATA_UNITS, JOB_ID_MAX_LENGTH } from '../constants/validation';
import { parseInterval } from './parse_interval';
import { maxLengthValidator } from './validators';
import { CREATED_BY_LABEL } from '../constants/new_job';
import { CombinedJob, CustomSettings, Datafeed, JobId, Job } from '../types/anomaly_detection_jobs';
import { EntityField } from './anomaly_utils';
import { MlServerLimits } from '../types/ml_server_info';
import { JobValidationMessage, JobValidationMessageId } from '../constants/messages';
import { ES_AGGREGATION, ML_JOB_AGGREGATION } from '../constants/aggregation_types';

export interface ValidationResults {
  valid: boolean;
  messages: JobValidationMessage[];
  contains: (id: JobValidationMessageId) => boolean;
  find: (id: JobValidationMessageId) => { id: JobValidationMessageId } | undefined;
}

// work out the default frequency based on the bucket_span in seconds
export function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds: number): number {
  let freq = 3600;
  if (bucketSpanSeconds <= 120) {
    freq = 60;
  } else if (bucketSpanSeconds <= 1200) {
    freq = Math.floor(bucketSpanSeconds / 2);
  } else if (bucketSpanSeconds <= 43200) {
    freq = 600;
  }

  return freq;
}

// Returns a flag to indicate whether the job is suitable for viewing
// in the Time Series dashboard.
export function isTimeSeriesViewJob(job: CombinedJob): boolean {
  // only allow jobs with at least one detector whose function corresponds to
  // an ES aggregation which can be viewed in the single metric view and which
  // doesn't use a scripted field which can be very difficult or impossible to
  // invert to a reverse search, or when model plot has been enabled.
  for (let i = 0; i < job.analysis_config.detectors.length; i++) {
    if (isTimeSeriesViewDetector(job, i)) {
      return true;
    }
  }

  return false;
}

// Returns a flag to indicate whether the detector at the index in the specified job
// is suitable for viewing in the Time Series dashboard.
export function isTimeSeriesViewDetector(job: CombinedJob, detectorIndex: number): boolean {
  return (
    isSourceDataChartableForDetector(job, detectorIndex) ||
    isModelPlotChartableForDetector(job, detectorIndex)
  );
}

// Returns a flag to indicate whether the source data can be plotted in a time
// series chart for the specified detector.
export function isSourceDataChartableForDetector(job: CombinedJob, detectorIndex: number): boolean {
  let isSourceDataChartable = false;
  const { detectors } = job.analysis_config;
  if (detectorIndex >= 0 && detectorIndex < detectors.length) {
    const dtr = detectors[detectorIndex];
    const functionName = dtr.function;

    // Check that the function maps to an ES aggregation,
    // and that the partitioning field isn't mlcategory
    // (since mlcategory is a derived field which won't exist in the source data).
    // Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
    // whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
    isSourceDataChartable =
      mlFunctionToESAggregation(functionName) !== null &&
      dtr.by_field_name !== 'mlcategory' &&
      dtr.partition_field_name !== 'mlcategory' &&
      dtr.over_field_name !== 'mlcategory';

    // If the datafeed uses script fields, we can only plot the time series if
    // model plot is enabled. Without model plot it will be very difficult or impossible
    // to invert to a reverse search of the underlying metric data.
    if (isSourceDataChartable === true && typeof job.datafeed_config?.script_fields === 'object') {
      // Perform extra check to see if the detector is using a scripted field.
      const scriptFields = Object.keys(job.datafeed_config.script_fields);
      isSourceDataChartable =
        scriptFields.indexOf(dtr.field_name!) === -1 &&
        scriptFields.indexOf(dtr.partition_field_name!) === -1 &&
        scriptFields.indexOf(dtr.by_field_name!) === -1 &&
        scriptFields.indexOf(dtr.over_field_name!) === -1;
    }
  }

  return isSourceDataChartable;
}

// Returns a flag to indicate whether model plot data can be plotted in a time
// series chart for the specified detector.
export function isModelPlotChartableForDetector(job: Job, detectorIndex: number): boolean {
  let isModelPlotChartable = false;

  const modelPlotEnabled = job.model_plot_config?.enabled ?? false;
  const { detectors } = job.analysis_config;
  if (detectorIndex >= 0 && detectorIndex < detectors.length && modelPlotEnabled) {
    const dtr = detectors[detectorIndex];
    const functionName = dtr.function as ML_JOB_AGGREGATION;

    // Model plot can be charted for any of the functions which map to ES aggregations
    // (except rare, for which no model plot results are generated),
    // plus varp and info_content functions.
    isModelPlotChartable =
      functionName !== ML_JOB_AGGREGATION.RARE &&
      (mlFunctionToESAggregation(functionName) !== null ||
        [
          ML_JOB_AGGREGATION.VARP,
          ML_JOB_AGGREGATION.HIGH_VARP,
          ML_JOB_AGGREGATION.LOW_VARP,
          ML_JOB_AGGREGATION.INFO_CONTENT,
          ML_JOB_AGGREGATION.HIGH_INFO_CONTENT,
          ML_JOB_AGGREGATION.LOW_INFO_CONTENT,
        ].includes(functionName));
  }

  return isModelPlotChartable;
}

// Returns the names of the partition, by, and over fields for the detector with the
// specified index from the supplied ML job configuration.
export function getPartitioningFieldNames(job: CombinedJob, detectorIndex: number): string[] {
  const fieldNames: string[] = [];
  const detector = job.analysis_config.detectors[detectorIndex];
  if (typeof detector.partition_field_name === 'string') {
    fieldNames.push(detector.partition_field_name);
  }
  if (typeof detector.by_field_name === 'string') {
    fieldNames.push(detector.by_field_name);
  }
  if (typeof detector.over_field_name === 'string') {
    fieldNames.push(detector.over_field_name);
  }

  return fieldNames;
}

// Returns a flag to indicate whether model plot has been enabled for a job.
// If model plot is enabled for a job with a terms filter (comma separated
// list of partition or by field names), performs additional checks that
// the supplied entities contains 'by' and 'partition' fields in the detector,
// if configured, whose values are in the configured model_plot_config terms,
// where entityFields is in the format [{fieldName:status, fieldValue:404}].
export function isModelPlotEnabled(
  job: Job,
  detectorIndex: number,
  entityFields?: EntityField[]
): boolean {
  // Check if model_plot_config is enabled.
  let isEnabled = job.model_plot_config?.enabled ?? false;

  if (isEnabled && entityFields !== undefined && entityFields.length > 0) {
    // If terms filter is configured in model_plot_config, check supplied entities.
    const termsStr = job.model_plot_config?.terms ?? '';
    if (termsStr !== '') {
      // NB. Do not currently support empty string values as being valid 'by' or
      // 'partition' field values even though this is supported on the back-end.
      // If supplied, check both the by and partition entities are in the terms.
      const detector = job.analysis_config.detectors[detectorIndex];
      const detectorHasPartitionField = detector.hasOwnProperty('partition_field_name');
      const detectorHasByField = detector.hasOwnProperty('by_field_name');
      const terms = termsStr.split(',');

      if (detectorHasPartitionField) {
        const partitionEntity = entityFields.find(
          (entityField) => entityField.fieldName === detector.partition_field_name
        );
        isEnabled =
          partitionEntity?.fieldValue !== undefined &&
          terms.indexOf(String(partitionEntity.fieldValue)) !== -1;
      }

      if (isEnabled === true && detectorHasByField === true) {
        const byEntity = entityFields.find(
          (entityField) => entityField.fieldName === detector.by_field_name
        );
        isEnabled =
          byEntity?.fieldValue !== undefined && terms.indexOf(String(byEntity.fieldValue)) !== -1;
      }
    }
  }

  return isEnabled;
}

// Returns whether the version of the job (the version number of the elastic stack that the job was
// created with) is greater than or equal to the supplied version (e.g. '6.1.0').
export function isJobVersionGte(job: CombinedJob, version: string): boolean {
  const jobVersion = job.job_version ?? '0.0.0';
  return semver.gte(jobVersion, version);
}

// Takes an ML detector 'function' and returns the corresponding ES aggregation name
// for querying metric data. Returns null if there is no suitable ES aggregation.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
export function mlFunctionToESAggregation(
  functionName: ML_JOB_AGGREGATION | string
): ES_AGGREGATION | null {
  if (
    functionName === ML_JOB_AGGREGATION.MEAN ||
    functionName === ML_JOB_AGGREGATION.HIGH_MEAN ||
    functionName === ML_JOB_AGGREGATION.LOW_MEAN ||
    functionName === ML_JOB_AGGREGATION.METRIC
  ) {
    return ES_AGGREGATION.AVG;
  }

  if (
    functionName === ML_JOB_AGGREGATION.SUM ||
    functionName === ML_JOB_AGGREGATION.HIGH_SUM ||
    functionName === ML_JOB_AGGREGATION.LOW_SUM ||
    functionName === ML_JOB_AGGREGATION.NON_NULL_SUM ||
    functionName === ML_JOB_AGGREGATION.LOW_NON_NULL_SUM ||
    functionName === ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM
  ) {
    return ES_AGGREGATION.SUM;
  }

  if (
    functionName === ML_JOB_AGGREGATION.COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_COUNT ||
    functionName === ML_JOB_AGGREGATION.NON_ZERO_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT
  ) {
    return ES_AGGREGATION.COUNT;
  }

  if (
    functionName === ML_JOB_AGGREGATION.DISTINCT_COUNT ||
    functionName === ML_JOB_AGGREGATION.LOW_DISTINCT_COUNT ||
    functionName === ML_JOB_AGGREGATION.HIGH_DISTINCT_COUNT
  ) {
    return ES_AGGREGATION.CARDINALITY;
  }

  if (
    functionName === ML_JOB_AGGREGATION.MEDIAN ||
    functionName === ML_JOB_AGGREGATION.HIGH_MEDIAN ||
    functionName === ML_JOB_AGGREGATION.LOW_MEDIAN
  ) {
    return ES_AGGREGATION.PERCENTILES;
  }

  if (functionName === ML_JOB_AGGREGATION.MIN || functionName === ML_JOB_AGGREGATION.MAX) {
    return (functionName as unknown) as ES_AGGREGATION;
  }

  if (functionName === ML_JOB_AGGREGATION.RARE) {
    return ES_AGGREGATION.COUNT;
  }

  // Return null if ML function does not map to an ES aggregation.
  // i.e. median, low_median, high_median, freq_rare,
  // varp, low_varp, high_varp, time_of_day, time_of_week, lat_long,
  // info_content, low_info_content, high_info_content
  return null;
}

// Job name must contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores;
// it must also start and end with an alphanumeric character'
export function isJobIdValid(jobId: JobId): boolean {
  return /^[a-z0-9\-\_]+$/g.test(jobId) && !/^([_-].*)?(.*[_-])?$/g.test(jobId);
}

// To get median data for jobs and charts we need to use Elasticsearch's
// percentiles aggregation. This setting is used with the `percents` field
// of the percentiles aggregation to get the correct data.
export const ML_MEDIAN_PERCENTS = '50.0';

// The number of preview items to show up in
// the Advanced Job Configuration data/datafeed preview tab
export const ML_DATA_PREVIEW_COUNT = 10;

// add a prefix to a datafeed id before the "datafeed-" part of the name
export function prefixDatafeedId(datafeedId: string, prefix: string): string {
  return datafeedId.match(/^datafeed-/)
    ? datafeedId.replace(/^datafeed-/, `datafeed-${prefix}`)
    : `datafeed-${prefix}${datafeedId}`;
}

// Returns a name which is safe to use in elasticsearch aggregations for the supplied
// field name. Aggregation names must be alpha-numeric and can only contain '_' and '-' characters,
// so if the supplied field names contains disallowed characters, the provided index
// identifier is used to return a safe 'dummy' name in the format 'field_index' e.g. field_0, field_1
export function getSafeAggregationName(fieldName: string, index: number): string {
  return fieldName.match(/^[a-zA-Z0-9-_.]+$/) ? fieldName : `field_${index}`;
}

export function uniqWithIsEqual<T extends any[]>(arr: T): T {
  return arr.reduce((dedupedArray, value) => {
    if (dedupedArray.filter((compareValue: any) => _.isEqual(compareValue, value)).length === 0) {
      dedupedArray.push(value);
    }
    return dedupedArray;
  }, []);
}

// check job without manipulating UI and return a list of messages
// job and fields get passed as arguments and are not accessed as $scope.* via the outer scope
// because the plan is to move this function to the common code area so that it can be used on the server side too.
export function basicJobValidation(
  job: Job,
  fields: object | undefined,
  limits: MlServerLimits,
  skipMmlChecks = false
): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (job) {
    // Job details
    if (_.isEmpty(job.job_id)) {
      messages.push({ id: 'job_id_empty' });
      valid = false;
    } else if (isJobIdValid(job.job_id) === false) {
      messages.push({ id: 'job_id_invalid' });
      valid = false;
    } else if (maxLengthValidator(JOB_ID_MAX_LENGTH)(job.job_id)) {
      messages.push({ id: 'job_id_invalid_max_length', maxLength: JOB_ID_MAX_LENGTH });
      valid = false;
    } else {
      messages.push({ id: 'job_id_valid' });
    }

    // group names
    const { messages: groupsMessages, valid: groupsValid } = validateGroupNames(job);

    messages.push(...groupsMessages);
    valid = valid && groupsValid;

    // Analysis Configuration
    if (job.analysis_config.categorization_filters) {
      let v = true;
      _.each(job.analysis_config.categorization_filters, (d) => {
        try {
          new RegExp(d);
        } catch (e) {
          v = false;
        }

        if (
          job.analysis_config.categorization_field_name === undefined ||
          job.analysis_config.categorization_field_name === ''
        ) {
          v = false;
        }

        if (d === '') {
          v = false;
        }
      });

      if (v) {
        messages.push({ id: 'categorization_filters_valid' });
      } else {
        messages.push({ id: 'categorization_filters_invalid' });
        valid = false;
      }
    }

    if (job.analysis_config.detectors.length === 0) {
      messages.push({ id: 'detectors_empty' });
      valid = false;
    } else {
      let v = true;
      _.each(job.analysis_config.detectors, (d) => {
        if (_.isEmpty(d.function)) {
          v = false;
        }
      });
      if (v) {
        messages.push({ id: 'detectors_function_not_empty' });
      } else {
        messages.push({ id: 'detectors_function_empty' });
        valid = false;
      }
    }

    // check for duplicate detectors
    if (job.analysis_config.detectors.length >= 2) {
      // create an array of objects with a subset of the attributes
      // where we want to make sure they are not be the same across detectors
      const compareSubSet = job.analysis_config.detectors.map((d) =>
        _.pick(d, [
          'function',
          'field_name',
          'by_field_name',
          'over_field_name',
          'partition_field_name',
        ])
      );

      const dedupedSubSet = uniqWithIsEqual(compareSubSet);

      if (compareSubSet.length !== dedupedSubSet.length) {
        messages.push({ id: 'detectors_duplicates' });
        valid = false;
      }
    }

    // we skip this influencer test because the client side form check is ignoring it
    // and the server side tests have their own influencer test
    // TODO: clarify if this is still needed or can be deleted
    /*
    if (job.analysis_config.influencers &&
      job.analysis_config.influencers.length === 0) {
      messages.push({ id: 'influencers_low' });
      valid = false;
    } else {
      messages.push({ id: 'success_influencers' });
    }
    */

    if (job.analysis_config.bucket_span === '' || job.analysis_config.bucket_span === undefined) {
      messages.push({ id: 'bucket_span_empty' });
      valid = false;
    } else {
      if (isValidTimeInterval(job.analysis_config.bucket_span)) {
        messages.push({
          id: 'bucket_span_valid',
          bucketSpan: job.analysis_config.bucket_span,
        });
      } else {
        messages.push({ id: 'bucket_span_invalid' });
        valid = false;
      }
    }

    // Datafeed
    if (typeof fields !== 'undefined') {
      const loadedFields = Object.keys(fields);
      if (loadedFields.length === 0) {
        messages.push({ id: 'index_fields_invalid' });
        valid = false;
      } else {
        messages.push({ id: 'index_fields_valid' });
      }
    }

    if (skipMmlChecks === false) {
      // model memory limit
      const mml = job.analysis_limits && job.analysis_limits.model_memory_limit;
      const { messages: mmlUnitMessages, valid: mmlUnitValid } = validateModelMemoryLimitUnits(mml);

      messages.push(...mmlUnitMessages);
      valid = valid && mmlUnitValid;

      if (mmlUnitValid) {
        // if mml is a valid format,
        // run the validation against max mml
        const { messages: mmlMessages, valid: mmlValid } = validateModelMemoryLimit(job, limits);

        messages.push(...mmlMessages);
        valid = valid && mmlValid;
      }
    }
  } else {
    valid = false;
  }

  return {
    messages,
    valid,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

export function basicDatafeedValidation(datafeed: Datafeed): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (datafeed) {
    let queryDelayMessage = { id: 'query_delay_valid' };
    if (isValidTimeInterval(datafeed.query_delay) === false) {
      queryDelayMessage = { id: 'query_delay_invalid' };
      valid = false;
    }
    messages.push(queryDelayMessage);

    let frequencyMessage = { id: 'frequency_valid' };
    if (isValidTimeInterval(datafeed.frequency) === false) {
      frequencyMessage = { id: 'frequency_invalid' };
      valid = false;
    }
    messages.push(frequencyMessage);
  }

  return {
    messages,
    valid,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

export function validateModelMemoryLimit(job: Job, limits: MlServerLimits): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;
  // model memory limit
  if (
    typeof job.analysis_limits !== 'undefined' &&
    typeof job.analysis_limits.model_memory_limit !== 'undefined'
  ) {
    if (typeof limits === 'object' && typeof limits.max_model_memory_limit !== 'undefined') {
      const max = limits.max_model_memory_limit.toUpperCase();
      const mml = job.analysis_limits.model_memory_limit.toUpperCase();

      // @ts-ignore
      const mmlBytes = numeral(mml).value();
      // @ts-ignore
      const maxBytes = numeral(max).value();

      if (mmlBytes > maxBytes) {
        messages.push({ id: 'model_memory_limit_invalid' });
        valid = false;
      } else {
        messages.push({ id: 'model_memory_limit_valid' });
      }
    }
  }
  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

export function validateModelMemoryLimitUnits(
  modelMemoryLimit: string | undefined
): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (modelMemoryLimit !== undefined) {
    const mml = String(modelMemoryLimit).toUpperCase();
    const mmlSplit = mml.match(/\d+(\w+)$/);
    const unit = mmlSplit && mmlSplit.length === 2 ? mmlSplit[1] : null;

    if (unit === null || ALLOWED_DATA_UNITS.indexOf(unit) === -1) {
      messages.push({ id: 'model_memory_limit_units_invalid' });
      valid = false;
    } else {
      messages.push({ id: 'model_memory_limit_units_valid' });
    }
  }

  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

export function validateGroupNames(job: Job): ValidationResults {
  const { groups = [] } = job;
  const errorMessages: ValidationResults['messages'] = [
    ...(groups.some((group) => !isJobIdValid(group)) ? [{ id: 'job_group_id_invalid' }] : []),
    ...(groups.some((group) => maxLengthValidator(JOB_ID_MAX_LENGTH)(group))
      ? [{ id: 'job_group_id_invalid_max_length' }]
      : []),
  ];
  const valid = errorMessages.length === 0;
  const messages = valid && groups.length ? [{ id: 'job_group_id_valid' }] : errorMessages;

  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}

/**
 * Parses the supplied string to a time interval suitable for use in an ML anomaly
 * detection job or datafeed.
 * @param value the string to parse
 * @return {Duration} the parsed interval, or null if it does not represent a valid
 * time interval.
 */
export function parseTimeIntervalForJob(value: string | undefined): Duration | null {
  if (value === undefined) {
    return null;
  }

  // Must be a valid interval, greater than zero,
  // and if specified in ms must be a multiple of 1000ms.
  const interval = parseInterval(value, true);
  return interval !== null && interval.asMilliseconds() !== 0 && interval.milliseconds() === 0
    ? interval
    : null;
}

// Checks that the value for a field which represents a time interval,
// such as a job bucket span or datafeed query delay, is valid.
function isValidTimeInterval(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  return parseTimeIntervalForJob(value) !== null;
}

// The earliest start time for the datafeed should be the max(latest_record_timestamp, latest_bucket.timestamp + bucket_span).
export function getEarliestDatafeedStartTime(
  latestRecordTimestamp: number | undefined,
  latestBucketTimestamp: number | undefined,
  bucketSpan?: Duration | null | undefined
): number | undefined {
  if (latestRecordTimestamp !== undefined && latestBucketTimestamp !== undefined) {
    // if bucket span is available (e.g. 15m) add it to the latest bucket timestamp in ms
    const adjustedBucketStartTime = bucketSpan
      ? moment(latestBucketTimestamp).add(bucketSpan).valueOf()
      : latestBucketTimestamp;
    return Math.max(latestRecordTimestamp, adjustedBucketStartTime);
  } else {
    return latestRecordTimestamp !== undefined ? latestRecordTimestamp : latestBucketTimestamp;
  }
}

// Returns the latest of the last source data and last processed bucket timestamp,
// as used for example in setting the end time of results views for cases where
// anomalies might have been raised after the point at which data ingest has stopped.
export function getLatestDataOrBucketTimestamp(
  latestDataTimestamp: number | undefined,
  latestBucketTimestamp: number | undefined
): number | undefined {
  if (latestDataTimestamp !== undefined && latestBucketTimestamp !== undefined) {
    return Math.max(latestDataTimestamp, latestBucketTimestamp);
  } else {
    return latestDataTimestamp !== undefined ? latestDataTimestamp : latestBucketTimestamp;
  }
}

/**
 * If created_by is set in the job's custom_settings, remove it in case
 * it was created by a job wizard as the rules cannot currently be edited
 * in the job wizards and so would be lost in a clone.
 */
export function processCreatedBy(customSettings: CustomSettings) {
  if (Object.values(CREATED_BY_LABEL).includes(customSettings.created_by!)) {
    delete customSettings.created_by;
  }
}

export function splitIndexPatternNames(indexPatternName: string): string[] {
  return indexPatternName.includes(',')
    ? indexPatternName.split(',').map((i) => i.trim())
    : [indexPatternName];
}
