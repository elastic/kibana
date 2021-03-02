/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IScopedClusterClient } from 'kibana/server';
import { getAnalysisType } from '../../../common/util/analytics_utils';
import {
  INCLUDED_FIELDS_THRESHOLD,
  MINIMUM_NUM_FIELD_FOR_CHECK,
  PERCENT_EMPTY_LIMIT,
  TRAINING_DOCS_LOWER,
  TRAINING_DOCS_UPPER,
  VALIDATION_STATUS,
} from '../../../common/constants/validation';
import { getDependentVar } from '../../../common/util/analytics_utils';
import { extractErrorMessage } from '../../../common/util/errors';
import { SearchResponse7 } from '../../../common';
import { DataFrameAnalyticsConfig } from '../../../common/types/data_frame_analytics';

interface MissingAgg {
  [key: string]: {
    doc_count: number;
  };
}
interface CardinalityAgg {
  [key: string]: {
    value: number;
  };
}

type ValidationSearchResult = Omit<SearchResponse7, 'aggregations'> & {
  aggregations: MissingAgg | CardinalityAgg;
};

const defaultQuery = { match_all: {} };

const trainingPercentHeading = i18n.translate(
  'xpack.ml.models.dfaValidation.messages.trainingPercentHeading',
  {
    defaultMessage: 'Training percent',
  }
);
const analysisFieldsHeading = i18n.translate(
  'xpack.ml.models.dfaValidation.messages.analysisFieldsHeading',
  {
    defaultMessage: 'Analysis fields',
  }
);
const dependentVarHeading = i18n.translate(
  'xpack.ml.models.dfaValidation.messages.dependentVarHeading',
  {
    defaultMessage: 'Dependent variable',
  }
);

function getTrainingPercentAndNumFieldsMessages(trainingDocs: number, numIncludedFields: number) {
  let trainingPercentMessage;
  let fieldsMessage;

  if (trainingDocs >= TRAINING_DOCS_UPPER) {
    trainingPercentMessage = {
      id: 'training_percent_high',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.highTrainingPercentWarning', {
        defaultMessage:
          'High number of training docs may result in long running jobs. Try reducing the training percent.',
      }),
      status: VALIDATION_STATUS.WARNING,
      heading: trainingPercentHeading,
    };
  } else if (trainingDocs <= TRAINING_DOCS_LOWER) {
    trainingPercentMessage = {
      id: 'training_percent_low',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.lowTrainingPercentWarning', {
        defaultMessage:
          'Low number of training docs may result in inaccurate models. Try increasing the training percent or using a larger dataset.',
      }),
      status: VALIDATION_STATUS.WARNING,
      heading: trainingPercentHeading,
    };
  } else {
    trainingPercentMessage = {
      id: 'training_percent',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.trainingPercentSuccess', {
        defaultMessage: 'Training percent validation successful.',
      }),
      status: VALIDATION_STATUS.SUCCESS,
      heading: trainingPercentHeading,
    };
  }

  if (numIncludedFields && numIncludedFields > INCLUDED_FIELDS_THRESHOLD) {
    fieldsMessage = {
      id: 'included_fields',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.highAnalysisFieldsWarning', {
        defaultMessage: 'High number of analysis fields may result in long-running jobs.',
      }),
      status: VALIDATION_STATUS.WARNING,
      heading: analysisFieldsHeading,
    };
  } else {
    fieldsMessage = {
      id: 'included_fields',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.analysisFieldsSuccess', {
        defaultMessage: 'Analysis fields validation successful.',
      }),
      status: VALIDATION_STATUS.SUCCESS,
      heading: analysisFieldsHeading,
    };
  }
  return [trainingPercentMessage, fieldsMessage];
}

async function getValidationCheckMessages(
  asCurrentUser: IScopedClusterClient['asCurrentUser'],
  analyzedFields: string[],
  index: string | string[],
  query: any = defaultQuery,
  depVar: string,
  trainingPercent?: number
) {
  const messages = [];
  const emptyFields: string[] = [];

  const fieldLimit =
    analyzedFields.length <= MINIMUM_NUM_FIELD_FOR_CHECK
      ? analyzedFields.length
      : MINIMUM_NUM_FIELD_FOR_CHECK;

  let aggs = analyzedFields.slice(0, fieldLimit).reduce((acc, curr) => {
    acc[curr] = { missing: { field: curr } };
    return acc;
  }, {} as any);

  if (depVar !== '') {
    const depVarAgg =
      depVar !== ''
        ? {
            [`${depVar}_const`]: {
              cardinality: { field: depVar },
            },
          }
        : {};

    aggs = { ...aggs, ...depVarAgg };
  }

  try {
    const { body }: { body: ValidationSearchResult } = await asCurrentUser.search({
      index,
      size: 0,
      track_total_hits: true,
      body: {
        query,
        aggs,
      },
    });

    const totalDocs = body.hits.total.value;

    if (trainingPercent) {
      const trainingDocs = totalDocs * (trainingPercent / 100);
      const trainingPercentAndNumFieldsMessages = getTrainingPercentAndNumFieldsMessages(
        trainingDocs,
        analyzedFields.length
      );
      if (trainingPercentAndNumFieldsMessages.length) {
        messages.push(...trainingPercentAndNumFieldsMessages);
      }
    }

    if (body.aggregations) {
      Object.entries(body.aggregations).forEach(([aggName, { doc_count: docCount, value }]) => {
        if (aggName === `${depVar}_const`) {
          if (value === 1) {
            messages.push({
              id: 'dep_var_check',
              text: i18n.translate('xpack.ml.models.dfaValidation.messages.depVarConstantWarning', {
                defaultMessage: 'Dependent variable is a constant value.',
              }),
              status: VALIDATION_STATUS.WARNING,
              heading: dependentVarHeading,
            });
          } else {
            messages.push({
              id: 'dep_var_check',
              text: i18n.translate('xpack.ml.models.dfaValidation.messages.depVarSuccess', {
                defaultMessage: 'Dependent variable validation successful.',
              }),
              status: VALIDATION_STATUS.SUCCESS,
              heading: dependentVarHeading,
            });
          }
        }

        const percentEmpty = docCount / totalDocs;
        if (docCount > 0 && percentEmpty > PERCENT_EMPTY_LIMIT) {
          emptyFields.push(aggName);
        }
      });
    }

    if (emptyFields.length) {
      messages.push({
        id: 'empty_fields',
        text: i18n.translate('xpack.ml.models.dfaValidation.messages.validationErrorText', {
          defaultMessage:
            'Some fields included for analysis have at least {percentEmpty}% empty values.',
          values: { percentEmpty: PERCENT_EMPTY_LIMIT * 100 },
        }),
        status: VALIDATION_STATUS.WARNING,
        heading: 'Empty fields',
      });
    }
  } catch (e) {
    const error = extractErrorMessage(e);
    messages.push({
      id: 'validation_error',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.validationErrorText', {
        defaultMessage: 'An error occurred attempting to validate job. {error}',
        values: { error },
      }),
      status: VALIDATION_STATUS.ERROR,
      heading: i18n.translate('xpack.ml.models.dfaValidation.messages.validationErrorHeading', {
        defaultMessage: 'Unable to validate job',
      }),
    });
  }

  return messages;
}

export async function validateAnalyticsJob(
  client: IScopedClusterClient,
  job: DataFrameAnalyticsConfig
) {
  const analysisType = getAnalysisType(job.analysis);
  const analysis = job.analysis[analysisType];
  const depVar = getDependentVar(job.analysis);

  const messages = await getValidationCheckMessages(
    client.asCurrentUser,
    job.analyzed_fields.includes,
    job.source.index,
    job.source.query,
    depVar,
    // @ts-ignore
    analysis.training_percent
  );
  return messages;
}
