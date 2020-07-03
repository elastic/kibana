/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import Boom from 'boom';
import { ILegacyScopedClusterClient } from 'kibana/server';

import { TypeOf } from '@kbn/config-schema';
import { fieldsServiceProvider } from '../fields_service';
import { renderTemplate } from '../../../common/util/string_utils';
import {
  getMessages,
  MessageId,
  JobValidationMessageDef,
} from '../../../common/constants/messages';
import { VALIDATION_STATUS } from '../../../common/constants/validation';

import { basicJobValidation, uniqWithIsEqual } from '../../../common/util/job_utils';
// @ts-expect-error
import { validateBucketSpan } from './validate_bucket_span';
import { validateCardinality } from './validate_cardinality';
import { validateInfluencers } from './validate_influencers';
import { validateModelMemoryLimit } from './validate_model_memory_limit';
import { validateTimeRange, isValidTimeField } from './validate_time_range';
import { validateJobSchema } from '../../routes/schemas/job_validation_schema';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

export type ValidateJobPayload = TypeOf<typeof validateJobSchema>;

/**
 * Validates the job configuration after
 * @kbn/config-schema has checked the payload {@link validateJobSchema}.
 */
export async function validateJob(
  mlClusterClient: ILegacyScopedClusterClient,
  payload: ValidateJobPayload,
  kbnVersion = 'current',
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
    let validationMessages;

    if (basicValidation.valid === true) {
      // remove basic success messages from tests
      // where we run additional extended tests.
      const filteredBasicValidationMessages = basicValidation.messages.filter((m) => {
        return m.id !== 'bucket_span_valid';
      });

      // if no duration was part of the request, fall back to finding out
      // the time range of the time field of the index, but also check first
      // if the time field is a valid field of type 'date' using isValidTimeField()
      if (typeof duration === 'undefined' && (await isValidTimeField(mlClusterClient, job))) {
        const fs = fieldsServiceProvider(mlClusterClient);
        const index = job.datafeed_config.indices.join(',');
        const timeField = job.data_description.time_field;
        const timeRange = await fs.getTimeFieldRange(index, timeField, job.datafeed_config.query);

        duration = {
          start: timeRange.start.epoch,
          end: timeRange.end.epoch,
        };
      }

      validationMessages = filteredBasicValidationMessages;

      // next run only the cardinality tests to find out if they trigger an error
      // so we can decide later whether certain additional tests should be run
      const cardinalityMessages = await validateCardinality(mlClusterClient, job);
      validationMessages.push(...cardinalityMessages);
      const cardinalityError = cardinalityMessages.some((m) => {
        return messages[m.id as MessageId].status === VALIDATION_STATUS.ERROR;
      });

      validationMessages.push(
        ...(await validateBucketSpan(mlClusterClient, job, duration, isSecurityDisabled))
      );
      validationMessages.push(...(await validateTimeRange(mlClusterClient, job, duration)));

      // only run the influencer and model memory limit checks
      // if cardinality checks didn't return a message with an error level
      if (cardinalityError === false) {
        validationMessages.push(...(await validateInfluencers(job)));
        validationMessages.push(
          ...(await validateModelMemoryLimit(mlClusterClient, job, duration))
        );
      }
    } else {
      validationMessages = basicValidation.messages;
      validationMessages.push({ id: 'skipped_extended_tests' });
    }

    return uniqWithIsEqual(validationMessages).map((message) => {
      const messageId = message.id as MessageId;
      const messageDef = messages[messageId] as JobValidationMessageDef;
      if (typeof messageDef !== 'undefined') {
        // render the message template with the provided metadata
        if (typeof messageDef.heading !== 'undefined') {
          message.heading = renderTemplate(messageDef.heading, message);
        }
        message.text = renderTemplate(messageDef.text, message);
        // check if the error message provides a link with further information
        // if so, add it to the message to be returned with it
        if (typeof messageDef.url !== 'undefined') {
          // the link is also treated as a template so we're able to dynamically link to
          // documentation links matching the running version of Kibana.
          message.url = renderTemplate(messageDef.url, { version: kbnVersion! });
        }

        message.status = messageDef.status;
      } else {
        message.text = i18n.translate(
          'xpack.ml.models.jobValidation.unknownMessageIdErrorMessage',
          {
            defaultMessage: '{messageId} (unknown message id)',
            values: { messageId },
          }
        );
      }

      return message;
    });
  } catch (error) {
    throw Boom.badRequest(error);
  }
}
