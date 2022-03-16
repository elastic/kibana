/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { IScopedClusterClient } from 'kibana/server';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { validateJobObject } from './validate_job_object';
import { calculateModelMemoryLimitProvider } from '../calculate_model_memory_limit';
import { ALLOWED_DATA_UNITS } from '../../../common/constants/validation';
import type { MlClient } from '../../lib/ml_client';

// The minimum value the backend expects is 1MByte
const MODEL_MEMORY_LIMIT_MINIMUM_BYTES = 1048576;

export async function validateModelMemoryLimit(
  client: IScopedClusterClient,
  mlClient: MlClient,
  job: CombinedJob,
  duration?: { start?: number; end?: number }
) {
  validateJobObject(job);

  // retrieve the model memory limit specified by the user in the job config.
  // note, this will probably be the auto generated value, unless the user has
  // over written it.
  const mml = job?.analysis_limits?.model_memory_limit?.toUpperCase() ?? null;

  const messages = [];

  // check that mml is a valid data format
  if (mml !== null) {
    const mmlSplit = mml.match(/\d+(\w+)/);
    const unit = mmlSplit && mmlSplit.length === 2 ? mmlSplit[1] : null;

    if (unit === null || !ALLOWED_DATA_UNITS.includes(unit)) {
      messages.push({
        id: 'mml_value_invalid',
        mml,
      });
      // mml is not a valid data format.
      // abort all other tests
      return messages;
    }
  }

  // if there is no duration, do not run the estimate test
  const runCalcModelMemoryTest =
    duration && duration?.start !== undefined && duration?.end !== undefined;

  // retrieve the max_model_memory_limit value from the server
  // this will be unset unless the user has set this on their cluster
  const body = await mlClient.info();
  const maxModelMemoryLimit = body.limits.max_model_memory_limit?.toUpperCase();
  const effectiveMaxModelMemoryLimit = body.limits.effective_max_model_memory_limit?.toUpperCase();

  if (runCalcModelMemoryTest) {
    const { modelMemoryLimit } = await calculateModelMemoryLimitProvider(client, mlClient)(
      job.analysis_config,
      job.datafeed_config.indices.join(','),
      job.datafeed_config.query,
      job.data_description.time_field!,
      duration!.start as number,
      duration!.end as number,
      true,
      job.datafeed_config
    );
    // @ts-expect-error numeral missing value
    const mmlEstimateBytes: number = numeral(modelMemoryLimit).value();

    let runEstimateGreaterThenMml = true;
    // if max_model_memory_limit has been set,
    // make sure the estimated value is not greater than it.
    if (typeof maxModelMemoryLimit !== 'undefined') {
      // @ts-expect-error numeral missing value
      const maxMmlBytes: number = numeral(maxModelMemoryLimit).value();
      if (mmlEstimateBytes > maxMmlBytes) {
        runEstimateGreaterThenMml = false;
        messages.push({
          id: 'estimated_mml_greater_than_max_mml',
          maxModelMemoryLimit,
          modelMemoryLimit,
        });
      }
    }

    // check to see if the estimated mml is greater that the user
    // specified mml
    // do not run this if we've already found that it's larger than
    // the max mml
    if (runEstimateGreaterThenMml && mml !== null) {
      // @ts-expect-error numeral missing value
      const mmlBytes: number = numeral(mml).value();
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
  if (mml !== null) {
    let maxMmlExceeded = false;
    // @ts-expect-error numeral missing value
    const mmlBytes = numeral(mml).value();

    if (maxModelMemoryLimit !== undefined) {
      // @ts-expect-error numeral missing value
      const maxMmlBytes = numeral(maxModelMemoryLimit).value();
      if (mmlBytes > maxMmlBytes) {
        maxMmlExceeded = true;
        messages.push({
          id: 'mml_greater_than_max_mml',
          maxModelMemoryLimit,
          mml,
        });
      }
    }

    if (effectiveMaxModelMemoryLimit !== undefined && maxMmlExceeded === false) {
      // @ts-expect-error numeral missing value
      const effectiveMaxMmlBytes = numeral(effectiveMaxModelMemoryLimit).value();
      if (mmlBytes > effectiveMaxMmlBytes) {
        messages.push({
          id: 'mml_greater_than_effective_max_mml',
          maxModelMemoryLimit,
          mml,
          effectiveMaxModelMemoryLimit,
        });
      }
    }
  }

  if (messages.length === 0 && runCalcModelMemoryTest === true) {
    messages.push({ id: 'success_mml' });
  }

  return messages;
}
