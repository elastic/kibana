/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { i18n } from '@kbn/i18n';
import { JOB_ID_MAX_LENGTH, VALIDATION_STATUS } from './validation';

export type MessageId = keyof ReturnType<typeof getMessages>;

export interface JobValidationMessageDef {
  status: VALIDATION_STATUS;
  text: string;
  url?: string;
  heading?: string;
}

export type JobValidationMessageId =
  | MessageId
  | 'model_memory_limit_invalid'
  | 'model_memory_limit_valid'
  | 'model_memory_limit_units_invalid'
  | 'model_memory_limit_units_valid'
  | 'query_delay_invalid'
  | 'query_delay_valid'
  | 'frequency_valid'
  | 'frequency_invalid'
  // because we have some spread around
  | string;

export type JobValidationMessage = {
  id: JobValidationMessageId;
  url?: string;
  fieldName?: string;
  modelPlotCardinality?: number;
} & {
  [key: string]: any;
};

export const getMessages = once(() => {
  const createJobsDocsUrl = `https://www.elastic.co/guide/en/machine-learning/{{version}}/create-jobs.html`;

  return {
    field_not_aggregatable: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.fieldNotAggregatableMessage', {
        defaultMessage: 'Detector field {fieldName} is not an aggregatable field.',
        values: {
          fieldName: '"{{fieldName}}"',
        },
      }),
      url:
        'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-configuring-aggregation.html',
    },
    fields_not_aggregatable: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.fieldsNotAggregatableMessage', {
        defaultMessage: 'One of the detector fields is not an aggregatable field.',
      }),
      url:
        'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-configuring-aggregation.html',
    },
    cardinality_by_field: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.cardinalityByFieldMessage', {
        defaultMessage:
          'Cardinality of {fieldName} is above 1000 and might result in high memory usage.',
        values: {
          fieldName: 'by_field "{{fieldName}}"',
        },
      }),
      url: `${createJobsDocsUrl}#cardinality`,
    },
    cardinality_over_field_low: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.cardinalityOverFieldLowMessage',
        {
          defaultMessage:
            'Cardinality of {fieldName} is below 10 and might not be suitable for population analysis.',
          values: {
            fieldName: 'over_field "{{fieldName}}"',
          },
        }
      ),
      url: `${createJobsDocsUrl}#cardinality`,
    },
    cardinality_over_field_high: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.cardinalityOverFieldHighMessage',
        {
          defaultMessage:
            'Cardinality of {fieldName} is above 1000000 and might result in high memory usage.',
          values: {
            fieldName: 'over_field "{{fieldName}}"',
          },
        }
      ),
      url: `${createJobsDocsUrl}#cardinality`,
    },
    cardinality_partition_field: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.cardinalityPartitionFieldMessage',
        {
          defaultMessage:
            'Cardinality of {fieldName} is above 1000 and might result in high memory usage.',
          values: {
            fieldName: 'partition_field "{{fieldName}}"',
          },
        }
      ),
      url: `${createJobsDocsUrl}#cardinality`,
    },
    cardinality_model_plot_high: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.cardinalityModelPlotHighMessage',
        {
          defaultMessage:
            'The estimated cardinality of {modelPlotCardinality} ' +
            'of fields relevant to creating model plots might result in resource intensive jobs.',
          values: {
            modelPlotCardinality: '{{modelPlotCardinality}}',
          },
        }
      ),
    },
    categorization_filters_valid: {
      status: VALIDATION_STATUS.SUCCESS,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.categorizationFiltersValidMessage',
        {
          defaultMessage: 'Categorization filters checks passed.',
        }
      ),
      url:
        'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-configuring-categories.html',
    },
    categorization_filters_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.categorizationFiltersInvalidMessage',
        {
          defaultMessage:
            'The categorization filters configuration is invalid. ' +
            'Make sure filters are valid regular expressions and {categorizationFieldName} is set.',
          values: {
            categorizationFieldName: '"categorization_field_name"',
          },
        }
      ),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-analysisconfig',
    },
    bucket_span_empty: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanEmptyMessage', {
        defaultMessage: 'The bucket span field must be specified.',
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-analysisconfig',
    },
    bucket_span_estimation_mismatch: {
      status: VALIDATION_STATUS.INFO,
      heading: i18n.translate(
        'xpack.ml.models.jobValidation.messages.bucketSpanEstimationMismatchHeading',
        {
          defaultMessage: 'Bucket span',
        }
      ),
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.bucketSpanEstimationMismatchMessage',
        {
          defaultMessage:
            'Current bucket span is {currentBucketSpan}, but bucket span estimation returned {estimateBucketSpan}.',
          values: {
            currentBucketSpan: '"{{currentBucketSpan}}"',
            estimateBucketSpan: '"{{estimateBucketSpan}}"',
          },
        }
      ),
      url: `${createJobsDocsUrl}#bucket-span`,
    },
    bucket_span_high: {
      status: VALIDATION_STATUS.INFO,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanHighHeading', {
        defaultMessage: 'Bucket span',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanHighMessage', {
        defaultMessage:
          'Bucket span is 1 day or more. Be aware that days are considered as UTC days, not local days.',
      }),
      url: `${createJobsDocsUrl}#bucket-span`,
    },
    bucket_span_valid: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanValidHeading', {
        defaultMessage: 'Bucket span',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanValidMessage', {
        defaultMessage: 'Format of {bucketSpan} is valid.',
        values: {
          bucketSpan: '"{{bucketSpan}}"',
        },
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-analysisconfig',
    },
    bucket_span_invalid: {
      status: VALIDATION_STATUS.ERROR,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanInvalidHeading', {
        defaultMessage: 'Bucket span',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.bucketSpanInvalidMessage', {
        defaultMessage:
          'The specified bucket span is not a valid time interval format e.g. 10m, 1h. It also needs to be higher than zero.',
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-analysisconfig',
    },
    detectors_duplicates: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.detectorsDuplicatesMessage', {
        defaultMessage:
          'Duplicate detectors were found. Detectors having the same combined configuration for ' +
          '{functionParam}, {fieldNameParam}, {byFieldNameParam}, {overFieldNameParam} and ' +
          '{partitionFieldNameParam} are not allowed within the same job.',
        values: {
          functionParam: `'function'`,
          fieldNameParam: `'field_name'`,
          byFieldNameParam: `'by_field_name'`,
          overFieldNameParam: `'over_field_name'`,
          partitionFieldNameParam: `'partition_field_name'`,
        },
      }),
      url: `${createJobsDocsUrl}#detectors`,
    },
    detectors_empty: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.detectorsEmptyMessage', {
        defaultMessage: 'No detectors were found. At least one detector must be specified.',
      }),
      url: `${createJobsDocsUrl}#detectors`,
    },
    detectors_function_empty: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.detectorsFunctionEmptyMessage', {
        defaultMessage: 'One of the detector functions is empty.',
      }),
      url: `${createJobsDocsUrl}#detectors`,
    },
    detectors_function_not_empty: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate(
        'xpack.ml.models.jobValidation.messages.detectorsFunctionNotEmptyHeading',
        {
          defaultMessage: 'Detector functions',
        }
      ),
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.detectorsFunctionNotEmptyMessage',
        {
          defaultMessage: 'Presence of detector functions validated in all detectors.',
        }
      ),
      url: `${createJobsDocsUrl}#detectors`,
    },
    index_fields_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.indexFieldsInvalidMessage', {
        defaultMessage: 'Could not load fields from index.',
      }),
    },
    index_fields_valid: {
      status: VALIDATION_STATUS.SUCCESS,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.indexFieldsValidMessage', {
        defaultMessage: 'Index fields are present in the datafeed.',
      }),
    },
    influencer_high: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.influencerHighMessage', {
        defaultMessage:
          'The job configuration includes more than 3 influencers. ' +
          'Consider using fewer influencers or creating multiple jobs.',
      }),
      url: 'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-influencers.html',
    },
    influencer_low: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.influencerLowMessage', {
        defaultMessage:
          'No influencers have been configured. Picking an influencer is strongly recommended.',
      }),
      url: 'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-influencers.html',
    },
    influencer_low_suggestion: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.influencerLowSuggestionMessage',
        {
          defaultMessage:
            'No influencers have been configured. Consider using {influencerSuggestion} as an influencer.',
          values: { influencerSuggestion: '{{influencerSuggestion}}' },
        }
      ),
      url: 'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-influencers.html',
    },
    influencer_low_suggestions: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.influencerLowSuggestionsMessage',
        {
          defaultMessage:
            'No influencers have been configured. Consider using one or more of {influencerSuggestion}.',
          values: { influencerSuggestion: '{{influencerSuggestion}}' },
        }
      ),
      url: 'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-influencers.html',
    },
    job_id_empty: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.jobIdEmptyMessage', {
        defaultMessage: 'Job ID field must not be empty.',
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_id_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.jobIdInvalidMessage', {
        defaultMessage:
          'Job ID is invalid. It can contain lowercase alphanumeric (a-z and 0-9) characters, ' +
          'hyphens or underscores and must start and end with an alphanumeric character.',
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_id_invalid_max_length: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.jobIdInvalidMaxLengthErrorMessage',
        {
          defaultMessage:
            'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
          values: {
            maxLength: JOB_ID_MAX_LENGTH,
          },
        }
      ),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_id_valid: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.jobIdValidHeading', {
        defaultMessage: 'Job ID format is valid',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.jobIdValidMessage', {
        defaultMessage:
          'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, ' +
          'starts and ends with an alphanumeric character, and is no more than ' +
          '{maxLength, plural, one {# character} other {# characters}} long.',
        values: {
          maxLength: JOB_ID_MAX_LENGTH,
        },
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_group_id_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.jobGroupIdInvalidMessage', {
        defaultMessage:
          'One of the job group names is invalid. They can contain lowercase ' +
          'alphanumeric (a-z and 0-9) characters, hyphens or underscores and must start and end with an alphanumeric character.',
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_group_id_invalid_max_length: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.jobGroupIdInvalidMaxLengthErrorMessage',
        {
          defaultMessage:
            'Job group name must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
          values: {
            maxLength: JOB_ID_MAX_LENGTH,
          },
        }
      ),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    job_group_id_valid: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.jobGroupIdValidHeading', {
        defaultMessage: 'Job group id formats are valid',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.jobGroupIdValidMessage', {
        defaultMessage:
          'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, ' +
          'starts and ends with an alphanumeric character, and is no more than ' +
          '{maxLength, plural, one {# character} other {# characters}} long.',
        values: {
          maxLength: JOB_ID_MAX_LENGTH,
        },
      }),
      url:
        'https://www.elastic.co/guide/en/elasticsearch/reference/{{version}}/ml-job-resource.html#ml-job-resource',
    },
    skipped_extended_tests: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.skippedExtendedTestsMessage', {
        defaultMessage:
          'Skipped additional checks because the basic requirements of the job configuration were not met.',
      }),
    },
    success_cardinality: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.successCardinalityHeading', {
        defaultMessage: 'Cardinality',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.successCardinalityMessage', {
        defaultMessage: 'Cardinality of detector fields is within recommended bounds.',
      }),
      url: `${createJobsDocsUrl}#cardinality`,
    },
    success_bucket_span: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.successBucketSpanHeading', {
        defaultMessage: 'Bucket span',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.successBucketSpanMessage', {
        defaultMessage: 'Format of {bucketSpan} is valid and passed validation checks.',
        values: { bucketSpan: '"{{bucketSpan}}"' },
      }),
      url: `${createJobsDocsUrl}#bucket-span`,
    },
    success_influencers: {
      status: VALIDATION_STATUS.SUCCESS,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.successInfluencersMessage', {
        defaultMessage: 'Influencer configuration passed the validation checks.',
      }),
      url: 'https://www.elastic.co/guide/en/machine-learning/{{version}}/ml-influencers.html',
    },
    estimated_mml_greater_than_max_mml: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.estimatedMmlGreaterThanMaxMmlMessage',
        {
          defaultMessage:
            'The estimated model memory limit is greater than the max model memory limit configured for this cluster.',
        }
      ),
    },
    mml_greater_than_effective_max_mml: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.mmlGreaterThanEffectiveMaxMmlMessage',
        {
          defaultMessage:
            'Job will not be able to run in the current cluster because model memory limit is higher than {effectiveMaxModelMemoryLimit}.',
          values: { effectiveMaxModelMemoryLimit: '{{effectiveMaxModelMemoryLimit}}' },
        }
      ),
    },
    mml_greater_than_max_mml: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.mmlGreaterThanMaxMmlMessage', {
        defaultMessage:
          'The model memory limit is greater than the max model memory limit configured for this cluster.',
      }),
    },
    mml_value_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.mmlValueInvalidMessage', {
        defaultMessage:
          '{mml} is not a valid value for model memory limit. The value needs to be at least ' +
          '1MB and should be specified in bytes e.g. 10MB.',
        values: { mml: '{{mml}}' },
      }),
      url: `${createJobsDocsUrl}#model-memory-limits`,
    },
    half_estimated_mml_greater_than_mml: {
      status: VALIDATION_STATUS.WARNING,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.halfEstimatedMmlGreaterThanMmlMessage',
        {
          defaultMessage:
            'The specified model memory limit is less than half of the estimated model ' +
            'memory limit and will likely hit the hard limit.',
        }
      ),
      url: `${createJobsDocsUrl}#model-memory-limits`,
    },
    estimated_mml_greater_than_mml: {
      status: VALIDATION_STATUS.INFO,
      text: i18n.translate(
        'xpack.ml.models.jobValidation.messages.estimatedMmlGreaterThanMmlMessage',
        {
          defaultMessage:
            'The estimated model memory limit is greater than the model memory limit you have configured.',
        }
      ),
      url: `${createJobsDocsUrl}#model-memory-limits`,
    },
    success_mml: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.successMmlHeading', {
        defaultMessage: 'Model memory limit',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.successMmlMessage', {
        defaultMessage: 'Valid and within the estimated model memory limit.',
      }),
      url: `${createJobsDocsUrl}#model-memory-limits`,
    },
    success_time_range: {
      status: VALIDATION_STATUS.SUCCESS,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.successTimeRangeHeading', {
        defaultMessage: 'Time range',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.successTimeRangeMessage', {
        defaultMessage: 'Valid and long enough to model patterns in the data.',
      }),
    },
    time_field_invalid: {
      status: VALIDATION_STATUS.ERROR,
      text: i18n.translate('xpack.ml.models.jobValidation.messages.timeFieldInvalidMessage', {
        defaultMessage: `{timeField} cannot be used as the time field because it is not a field of type 'date' or 'date_nanos'.`,
        values: {
          timeField: `'{{timeField}}'`,
        },
      }),
    },
    time_range_short: {
      status: VALIDATION_STATUS.WARNING,
      heading: i18n.translate('xpack.ml.models.jobValidation.messages.timeRangeShortHeading', {
        defaultMessage: 'Time range',
      }),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.timeRangeShortMessage', {
        defaultMessage:
          'The selected or available time range might be too short. The recommended minimum ' +
          'time range should be at least {minTimeSpanReadable} and {bucketSpanCompareFactor} times the bucket span.',
        values: {
          minTimeSpanReadable: '{{minTimeSpanReadable}}',
          bucketSpanCompareFactor: '{{bucketSpanCompareFactor}}',
        },
      }),
    },
    time_range_before_epoch: {
      status: VALIDATION_STATUS.WARNING,
      heading: i18n.translate(
        'xpack.ml.models.jobValidation.messages.timeRangeBeforeEpochHeading',
        {
          defaultMessage: 'Time range',
        }
      ),
      text: i18n.translate('xpack.ml.models.jobValidation.messages.timeRangeBeforeEpochMessage', {
        defaultMessage:
          'The selected or available time range contains data with timestamps before ' +
          'the UNIX epoch beginning. Timestamps before 01/01/1970 00:00:00 (UTC) are not supported for machine learning jobs.',
      }),
    },
  };
});
