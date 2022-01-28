/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { fieldsServiceProvider } from '../fields_service';
import { getMessages, MessageId, JobValidationMessage } from '../../../common/constants/messages';
import { VALIDATION_STATUS } from '../../../common/constants/validation';

import { basicJobValidation, uniqWithIsEqual } from '../../../common/util/job_utils';
// @ts-expect-error importing js file
import { validateBucketSpan } from './validate_bucket_span';
import { validateCardinality } from './validate_cardinality';
import { validateInfluencers } from './validate_influencers';
import { validateDatafeedPreviewWithMessages } from './validate_datafeed_preview';
import { validateModelMemoryLimit } from './validate_model_memory_limit';
import { validateTimeRange, isValidTimeField } from './validate_time_range';
import { validateJobSchema } from '../../routes/schemas/job_validation_schema';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { MlClient } from '../../lib/ml_client';
import { getDatafeedAggregations } from '../../../common/util/datafeed_utils';
import type { AuthorizationHeader } from '../../lib/request_authorization';

export type ValidateJobPayload = TypeOf<typeof validateJobSchema>;

/**
 * Validates the job configuration after
 * @kbn/config-schema has checked the payload {@link validateJobSchema}.
 */
export async function validateJob(
  client: IScopedClusterClient,
  mlClient: MlClient,
  payload: ValidateJobPayload,
  authHeader: AuthorizationHeader,
  isSecurityDisabled?: boolean
) {
  const messages = getMessages();

  try {
    const { fields } = payload;
    let { duration } = payload;

    const job = payload.job as CombinedJob;

    // check if basic tests pass the requirements to run the extended tests.
    // if so, run the extended tests and merge the messages.
    // otherwise just return the basic test messages.
    const basicValidation = basicJobValidation(job, fields, {}, true);
    let validationMessages: JobValidationMessage[];

    if (basicValidation.valid === true) {
      // remove basic success messages from tests
      // where we run additional extended tests.
      const filteredBasicValidationMessages = basicValidation.messages.filter((m) => {
        return m.id !== 'bucket_span_valid';
      });

      // if no duration was part of the request, fall back to finding out
      // the time range of the time field of the index, but also check first
      // if the time field is a valid field of type 'date' using isValidTimeField()
      if (typeof duration === 'undefined' && (await isValidTimeField(client, job))) {
        const fs = fieldsServiceProvider(client);
        const index = job.datafeed_config.indices.join(',');
        const timeField = job.data_description.time_field!;
        const timeRange = await fs.getTimeFieldRange(
          index,
          timeField,
          job.datafeed_config.query,
          job.datafeed_config.runtime_mappings,
          job.datafeed_config.indices_options
        );

        duration = {
          start: timeRange.start.epoch,
          end: timeRange.end.epoch,
        };
      }

      validationMessages = filteredBasicValidationMessages;

      // next run only the cardinality tests to find out if they trigger an error
      // so we can decide later whether certain additional tests should be run
      const cardinalityMessages = await validateCardinality(client, job);
      validationMessages.push(...cardinalityMessages);
      const cardinalityError = cardinalityMessages.some((m) => {
        return messages[m.id as MessageId].status === VALIDATION_STATUS.ERROR;
      });

      validationMessages.push(
        ...(await validateBucketSpan(client, job, duration, isSecurityDisabled))
      );
      validationMessages.push(...(await validateTimeRange(client, job, duration)));

      // only run the influencer and model memory limit checks
      // if cardinality checks didn't return a message with an error level
      if (cardinalityError === false) {
        validationMessages.push(...(await validateInfluencers(job)));
        validationMessages.push(
          ...(await validateModelMemoryLimit(client, mlClient, job, duration))
        );
      }

      // if datafeed has aggregation, require job config to include a valid summary_doc_field_name
      const datafeedAggregations = getDatafeedAggregations(job.datafeed_config);
      if (datafeedAggregations !== undefined && !job.analysis_config?.summary_count_field_name) {
        validationMessages.push({ id: 'missing_summary_count_field_name' });
      }

      validationMessages.push(
        ...(await validateDatafeedPreviewWithMessages(mlClient, authHeader, job))
      );
    } else {
      validationMessages = basicValidation.messages;
      validationMessages.push({ id: 'skipped_extended_tests' });
    }

    return uniqWithIsEqual(validationMessages);
  } catch (error) {
    throw Boom.badRequest(error);
  }
}
