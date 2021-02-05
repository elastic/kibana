/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BasicValidations } from './job_validator';
import { Job, Datafeed } from '../../../../../../common/types/anomaly_detection_jobs';
import {
  ALLOWED_DATA_UNITS,
  JOB_ID_MAX_LENGTH,
} from '../../../../../../common/constants/validation';
import { getNewJobLimits } from '../../../../services/ml_server_info';
import { ValidationResults } from '../../../../../../common/util/job_utils';

export function populateValidationMessages(
  validationResults: ValidationResults,
  basicValidations: BasicValidations,
  jobConfig: Job,
  datafeedConfig: Datafeed
) {
  const limits = getNewJobLimits();

  if (validationResults.contains('job_id_empty')) {
    basicValidations.jobId.valid = false;
  } else if (validationResults.contains('job_id_invalid')) {
    basicValidations.jobId.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription',
      {
        defaultMessage:
          'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
          'must start and end with an alphanumeric character',
      }
    );
    basicValidations.jobId.message = msg;
  } else if (validationResults.contains('job_id_invalid_max_length')) {
    basicValidations.jobId.valid = false;
    basicValidations.jobId.message = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.jobIdInvalidMaxLengthErrorMessage',
      {
        defaultMessage:
          'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
        values: {
          maxLength: JOB_ID_MAX_LENGTH,
        },
      }
    );
  } else if (validationResults.contains('job_id_already_exists')) {
    basicValidations.jobId.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists', {
      defaultMessage:
        'Job ID already exists. A job ID cannot be the same as an existing job or group.',
    });
    basicValidations.jobId.message = msg;
  }

  if (validationResults.contains('job_group_id_invalid')) {
    basicValidations.groupIds.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.jobGroupAllowedCharactersDescription',
      {
        defaultMessage:
          'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
          'must start and end with an alphanumeric character',
      }
    );
    basicValidations.groupIds.message = msg;
  } else if (validationResults.contains('job_group_id_invalid_max_length')) {
    basicValidations.groupIds.valid = false;
    basicValidations.groupIds.message = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.jobGroupMaxLengthDescription',
      {
        defaultMessage:
          'Job group name must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
        values: {
          maxLength: JOB_ID_MAX_LENGTH,
        },
      }
    );
  } else if (validationResults.contains('job_group_id_already_exists')) {
    basicValidations.groupIds.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.wizard.validateJob.groupNameAlreadyExists', {
      defaultMessage:
        'Group ID already exists. A group ID cannot be the same as an existing job or group.',
    });
    basicValidations.groupIds.message = msg;
  }

  if (validationResults.contains('model_memory_limit_units_invalid')) {
    basicValidations.modelMemoryLimit.valid = false;
    const str = `${ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(', ')} or ${[
      ...ALLOWED_DATA_UNITS,
    ].pop()}`;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.modelMemoryLimitUnitsInvalidErrorMessage',
      {
        defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
        values: { str },
      }
    );
    basicValidations.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('model_memory_limit_invalid')) {
    basicValidations.modelMemoryLimit.valid = false;
    const maxModelMemoryLimit = (limits.max_model_memory_limit || '').toUpperCase();
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.modelMemoryLimitRangeInvalidErrorMessage',
      {
        defaultMessage:
          'Model memory limit cannot be higher than the maximum value of {maxModelMemoryLimit}',
        values: { maxModelMemoryLimit },
      }
    );
    basicValidations.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('detectors_duplicates')) {
    basicValidations.duplicateDetectors.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.duplicatedDetectorsErrorMessage',
      {
        defaultMessage: 'Duplicate detectors were found.',
      }
    );
    basicValidations.duplicateDetectors.message = msg;
  }

  if (validationResults.contains('categorizer_detector_missing_per_partition_field')) {
    basicValidations.categorizerMissingPerPartition.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.categorizerMissingPerPartitionFieldMessage',
      {
        defaultMessage:
          'Partition field must be set for detectors that reference "mlcategory" when per-partition categorization is enabled.',
      }
    );
    basicValidations.categorizerMissingPerPartition.message = msg;
  }
  if (validationResults.contains('categorizer_varying_per_partition_fields')) {
    basicValidations.categorizerVaryingPerPartitionField.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.categorizerVaryingPerPartitionFieldNamesMessage',
      {
        defaultMessage:
          'Detectors with keyword "mlcategory" cannot have different partition_field_name when per-partition categorization is enabled.',
      }
    );
    basicValidations.categorizerVaryingPerPartitionField.message = msg;
  }

  if (validationResults.contains('bucket_span_empty')) {
    basicValidations.bucketSpan.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.bucketSpanMustBeSetErrorMessage',
      {
        defaultMessage: 'Bucket span must be set',
      }
    );

    basicValidations.bucketSpan.message = msg;
  } else if (validationResults.contains('bucket_span_invalid')) {
    basicValidations.bucketSpan.valid = false;
    basicValidations.bucketSpan.message = invalidTimeIntervalMessage(
      jobConfig.analysis_config.bucket_span
    );
  }

  if (validationResults.contains('query_empty')) {
    basicValidations.query.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.wizard.validateJob.queryCannotBeEmpty', {
      defaultMessage: 'Datafeed query cannot be empty.',
    });
    basicValidations.query.message = msg;
  } else if (validationResults.contains('query_invalid')) {
    basicValidations.query.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.wizard.validateJob.queryIsInvalidEsQuery', {
      defaultMessage: 'Datafeed query must be a valid elasticsearch query.',
    });
    basicValidations.query.message = msg;
  }

  if (validationResults.contains('query_delay_invalid')) {
    basicValidations.queryDelay.valid = false;
    basicValidations.queryDelay.message = invalidTimeIntervalMessage(datafeedConfig.query_delay);
  }

  if (validationResults.contains('frequency_invalid')) {
    basicValidations.frequency.valid = false;
    basicValidations.frequency.message = invalidTimeIntervalMessage(datafeedConfig.frequency);
  }
  if (validationResults.contains('missing_summary_count_field_name')) {
    basicValidations.summaryCountField.valid = false;
    basicValidations.summaryCountField.message = i18n.translate(
      'xpack.ml.newJob.wizard.validateJob.summaryCountFieldMissing',
      {
        defaultMessage: 'Required field as the datafeed uses aggregations.',
      }
    );
  }
}

function invalidTimeIntervalMessage(value: string | undefined) {
  return i18n.translate(
    'xpack.ml.newJob.wizard.validateJob.frequencyInvalidTimeIntervalFormatErrorMessage',
    {
      defaultMessage:
        '{value} is not a valid time interval format e.g. {thirtySeconds}, {tenMinutes}, {oneHour}, {sevenDays}. It also needs to be higher than zero.',
      values: {
        value,
        thirtySeconds: '30s',
        tenMinutes: '10m',
        oneHour: '1h',
        sevenDays: '7d',
      },
    }
  );
}
