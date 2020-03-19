/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { validateJobObject } from './validate_job_object';
import { calculateModelMemoryLimitProvider } from '../../models/calculate_model_memory_limit';
import { ALLOWED_DATA_UNITS } from '../../../common/constants/validation';

// The minimum value the backend expects is 1MByte
const MODEL_MEMORY_LIMIT_MINIMUM_BYTES = 1048576;

export async function validateModelMemoryLimit(callWithRequest, job, duration) {
  validateJobObject(job);

  // retrieve the max_model_memory_limit value from the server
  // this will be unset unless the user has set this on their cluster
  const mlInfo = await callWithRequest('ml.info');
  const maxModelMemoryLimit =
    typeof mlInfo.limits === 'undefined' ? undefined : mlInfo.limits.max_model_memory_limit;

  // retrieve the model memory limit specified by the user in the job config.
  // note, this will probably be the auto generated value, unless the user has
  // over written it.
  const mml =
    typeof job.analysis_limits !== 'undefined' &&
    typeof job.analysis_limits.model_memory_limit !== 'undefined'
      ? job.analysis_limits.model_memory_limit.toUpperCase()
      : null;

  const splitFieldNames = {};
  let splitFieldName = '';
  const fieldNames = [];
  let runCalcModelMemoryTest = true;
  let validModelMemoryLimit = true;

  // extract the field names and partition field names from the detectors
  // we only want to estimate the mml for multi-metric jobs.
  // a multi-metric job will have one partition field, one or more field names
  // and no over or by fields
  job.analysis_config.detectors.forEach(d => {
    if (typeof d.field_name !== 'undefined') {
      fieldNames.push(d.field_name);
    }

    // create a deduplicated list of partition field names.
    if (typeof d.partition_field_name !== 'undefined') {
      splitFieldNames[d.partition_field_name] = null;
    }

    // if an over or by field is present, do not run the estimate test
    if (typeof d.over_field_name !== 'undefined' || typeof d.by_field_name !== 'undefined') {
      runCalcModelMemoryTest = false;
    }
  });

  // if there are no or more than one partition fields, do not run the test
  if (Object.keys(splitFieldNames).length === 1) {
    splitFieldName = Object.keys(splitFieldNames)[0];
  } else {
    runCalcModelMemoryTest = false;
  }

  // if there is no duration, do not run the estimate test
  if (
    typeof duration === 'undefined' ||
    typeof duration.start === 'undefined' ||
    typeof duration.end === 'undefined'
  ) {
    runCalcModelMemoryTest = false;
  }

  const messages = [];

  // check that mml is a valid data format
  if (mml !== null) {
    const mmlSplit = mml.match(/\d+(\w+)/);
    const unit = mmlSplit && mmlSplit.length === 2 ? mmlSplit[1] : null;

    if (ALLOWED_DATA_UNITS.indexOf(unit) === -1) {
      messages.push({
        id: 'mml_value_invalid',
        mml,
      });
      // mml is not a valid data format.
      // abort all other tests
      validModelMemoryLimit = false;
    }
  }

  if (validModelMemoryLimit) {
    if (runCalcModelMemoryTest) {
      const mmlEstimate = await calculateModelMemoryLimitProvider(callWithRequest)(
        job.datafeed_config.indices.join(','),
        splitFieldName,
        job.datafeed_config.query,
        fieldNames,
        job.analysis_config.influencers,
        job.data_description.time_field,
        duration.start,
        duration.end,
        true
      );
      const mmlEstimateBytes = numeral(mmlEstimate.modelMemoryLimit).value();

      let runEstimateGreaterThenMml = true;
      // if max_model_memory_limit has been set,
      // make sure the estimated value is not greater than it.
      if (typeof maxModelMemoryLimit !== 'undefined') {
        const maxMmlBytes = numeral(maxModelMemoryLimit.toUpperCase()).value();
        if (mmlEstimateBytes > maxMmlBytes) {
          runEstimateGreaterThenMml = false;
          messages.push({
            id: 'estimated_mml_greater_than_max_mml',
            maxModelMemoryLimit,
            mmlEstimate,
          });
        }
      }

      // check to see if the estimated mml is greater that the user
      // specified mml
      // do not run this if we've already found that it's larger than
      // the max mml
      if (runEstimateGreaterThenMml && mml !== null) {
        const mmlBytes = numeral(mml).value();
        if (mmlBytes < MODEL_MEMORY_LIMIT_MINIMUM_BYTES) {
          messages.push({
            id: 'mml_value_invalid',
            mml,
          });
        } else if (mmlEstimateBytes / 2 > mmlBytes) {
          messages.push({
            id: 'half_estimated_mml_greater_than_mml',
            maxModelMemoryLimit,
            mml,
          });
        } else if (mmlEstimateBytes > mmlBytes) {
          messages.push({
            id: 'estimated_mml_greater_than_mml',
            maxModelMemoryLimit,
            mml,
          });
        }
      }
    }

    // if max_model_memory_limit has been set,
    // make sure the user defined MML is not greater than it
    if (maxModelMemoryLimit !== undefined && mml !== null) {
      const maxMmlBytes = numeral(maxModelMemoryLimit.toUpperCase()).value();
      const mmlBytes = numeral(mml).value();
      if (mmlBytes > maxMmlBytes) {
        messages.push({
          id: 'mml_greater_than_max_mml',
          maxModelMemoryLimit,
          mml,
        });
      }
    }
  }

  if (messages.length === 0 && runCalcModelMemoryTest === true) {
    messages.push({ id: 'success_mml' });
  }

  return Promise.resolve(messages);
}
