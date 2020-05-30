/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

export function validateJobObject(job: CombinedJob | null | undefined): job is CombinedJob | never {
  if (job === null || typeof job !== 'object') {
    throw new Error(
      i18n.translate('xpack.ml.models.jobValidation.validateJobObject.jobIsNotObjectErrorMessage', {
        defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
        values: { invalidParamName: 'job' },
      })
    );
  }
  if (job.analysis_config === null || typeof job.analysis_config !== 'object') {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.analysisConfigIsNotObjectErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'job.analysis_config' },
        }
      )
    );
  }
  if (!Array.isArray(job.analysis_config.influencers)) {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.influencersAreNotArrayErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an array.',
          values: { invalidParamName: 'job.analysis_config.influencers' },
        }
      )
    );
  }
  if (!Array.isArray(job.analysis_config.detectors)) {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.detectorsAreNotArrayErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an array.',
          values: { invalidParamName: 'job.analysis_config.detectors' },
        }
      )
    );
  }
  if (job.datafeed_config === null || typeof job.datafeed_config !== 'object') {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.datafeedConfigIsNotObjectErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'job.datafeed_config' },
        }
      )
    );
  }
  if (!Array.isArray(job.datafeed_config.indices)) {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.indicesAreNotArrayErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an Array.',
          values: { invalidParamName: 'job.datafeed_config.indices' },
        }
      )
    );
  }
  if (job.data_description === null || typeof job.data_description !== 'object') {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.dataDescriptionIsNotObjectErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'job.data_description' },
        }
      )
    );
  }
  if (typeof job.data_description.time_field !== 'string') {
    throw new Error(
      i18n.translate(
        'xpack.ml.models.jobValidation.validateJobObject.timeFieldIsNotStringErrorMessage',
        {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be a string.',
          values: { invalidParamName: 'job.data_description.time_field' },
        }
      )
    );
  }
  return true;
}
