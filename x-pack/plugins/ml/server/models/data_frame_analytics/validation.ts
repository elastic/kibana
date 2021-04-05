/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { getAnalysisType } from '../../../common/util/analytics_utils';
import {
  ALL_CATEGORIES,
  FRACTION_EMPTY_LIMIT,
  INCLUDED_FIELDS_THRESHOLD,
  MINIMUM_NUM_FIELD_FOR_CHECK,
  NUM_CATEGORIES_THRESHOLD,
  TRAINING_DOCS_LOWER,
  TRAINING_DOCS_UPPER,
  VALIDATION_STATUS,
} from '../../../common/constants/validation';
import {
  getDependentVar,
  isRegressionAnalysis,
  isClassificationAnalysis,
} from '../../../common/util/analytics_utils';
import { extractErrorMessage } from '../../../common/util/errors';
import {
  AnalysisConfig,
  DataFrameAnalyticsConfig,
} from '../../../common/types/data_frame_analytics';

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

type ValidationSearchResult = Omit<estypes.SearchResponse, 'aggregations'> & {
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
const dependentVarWarningMessage = {
  id: 'dep_var_check',
  text: '',
  status: VALIDATION_STATUS.WARNING,
  heading: dependentVarHeading,
};
const analysisFieldsWarningMessage = {
  id: 'analysis_fields',
  text: '',
  status: VALIDATION_STATUS.WARNING,
  heading: analysisFieldsHeading,
};

function getRegressionAndClassificationMessage(
  analysisConfig: AnalysisConfig,
  analysisType: string,
  totalDocs: number,
  depVarCardinality: number | undefined
) {
  const messages = [];
  if (isRegressionAnalysis(analysisConfig) || isClassificationAnalysis(analysisConfig)) {
    const trainingPercent = analysisConfig[analysisType].training_percent;
    const featureImportance = analysisConfig[analysisType].num_top_feature_importance_values;
    const topClasses: number | undefined = isClassificationAnalysis(analysisConfig)
      ? analysisConfig[analysisType].num_top_classes
      : undefined;

    if (trainingPercent) {
      const trainingDocs = totalDocs * (trainingPercent / 100);
      const trainingPercentMessage = getTrainingPercentMessage(trainingDocs);
      if (trainingPercentMessage) {
        messages.push(trainingPercentMessage);
      }
    }

    if (featureImportance && featureImportance > 0) {
      messages.push({
        id: 'feature_importance',
        text: i18n.translate(
          'xpack.ml.models.dfaValidation.messages.featureImportanceWarningMessage',
          {
            defaultMessage:
              'Enabling feature importance can result in long running jobs when there are a large number of training documents.',
          }
        ),
        status: VALIDATION_STATUS.WARNING,
        heading: i18n.translate('xpack.ml.models.dfaValidation.messages.featureImportanceHeading', {
          defaultMessage: 'Feature importance',
        }),
      });
    }

    if (topClasses !== undefined) {
      if (
        (topClasses === ALL_CATEGORIES &&
          depVarCardinality &&
          depVarCardinality > NUM_CATEGORIES_THRESHOLD) ||
        topClasses > NUM_CATEGORIES_THRESHOLD
      ) {
        messages.push({
          id: 'num_top_classes',
          text: i18n.translate('xpack.ml.models.dfaValidation.messages.topClassesWarningMessage', {
            defaultMessage:
              'Probabilities will be reported for {numCategories, plural, one {# category} other {# categories}}. There could be a significant effect on the size of your destination index.',
            values: {
              numCategories: topClasses === ALL_CATEGORIES ? depVarCardinality : topClasses,
            },
          }),
          status: VALIDATION_STATUS.WARNING,
          heading: i18n.translate('xpack.ml.models.dfaValidation.messages.topClassesHeading', {
            defaultMessage: 'Top classes',
          }),
        });
      } else {
        messages.push({
          id: 'num_top_classes',
          text: i18n.translate('xpack.ml.models.dfaValidation.messages.topClassesSuccessMessage', {
            defaultMessage:
              'Probabilities will be reported for {numCategories, plural, one {# category} other {# categories}}.',
            values: {
              numCategories: topClasses === ALL_CATEGORIES ? depVarCardinality : topClasses,
            },
          }),
          status: VALIDATION_STATUS.SUCCESS,
          heading: i18n.translate('xpack.ml.models.dfaValidation.messages.topClassesHeading', {
            defaultMessage: 'Top classes',
          }),
        });
      }
    }
  }
  return messages;
}

function getTrainingPercentMessage(trainingDocs: number) {
  if (trainingDocs >= TRAINING_DOCS_UPPER) {
    return {
      id: 'training_percent_high',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.highTrainingPercentWarning', {
        defaultMessage:
          'A high number of training docs may result in long running jobs. Try reducing the training percent.',
      }),
      status: VALIDATION_STATUS.WARNING,
      heading: trainingPercentHeading,
    };
  } else if (trainingDocs <= TRAINING_DOCS_LOWER) {
    return {
      id: 'training_percent_low',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.lowTrainingPercentWarning', {
        defaultMessage:
          'A low number of training docs may result in inaccurate models. Try increasing the training percent or using a larger data set.',
      }),
      status: VALIDATION_STATUS.WARNING,
      heading: trainingPercentHeading,
    };
  } else {
    return {
      id: 'training_percent',
      text: i18n.translate('xpack.ml.models.dfaValidation.messages.trainingPercentSuccess', {
        defaultMessage: 'The training percent is high enough to model patterns in the data.',
      }),
      status: VALIDATION_STATUS.SUCCESS,
      heading: trainingPercentHeading,
    };
  }
}

async function getValidationCheckMessages(
  asCurrentUser: IScopedClusterClient['asCurrentUser'],
  analyzedFields: string[],
  index: string | string[],
  analysisConfig: AnalysisConfig,
  query: estypes.QueryContainer = defaultQuery
) {
  const analysisType = getAnalysisType(analysisConfig);
  const depVar = getDependentVar(analysisConfig);
  const messages = [];
  const emptyFields: string[] = [];
  const percentEmptyLimit = FRACTION_EMPTY_LIMIT * 100;

  let depVarValid = true;
  let depVarCardinality: number | undefined;
  let analysisFieldsNumHigh = false;
  let analysisFieldsEmpty = false;

  const fieldLimit =
    analyzedFields.length <= MINIMUM_NUM_FIELD_FOR_CHECK
      ? analyzedFields.length
      : MINIMUM_NUM_FIELD_FOR_CHECK;

  let aggs = analyzedFields.slice(0, fieldLimit).reduce((acc, curr) => {
    acc[curr] = { missing: { field: curr } };
    return acc;
  }, {} as any);

  if (depVar !== '') {
    const depVarAgg = {
      [`${depVar}_const`]: {
        cardinality: { field: depVar },
      },
    };

    aggs = { ...aggs, ...depVarAgg };
  }

  try {
    const { body } = await asCurrentUser.search<ValidationSearchResult>({
      index,
      size: 0,
      track_total_hits: true,
      body: {
        query,
        aggs,
      },
    });

    // @ts-expect-error
    const totalDocs = body.hits.total.value;

    if (body.aggregations) {
      // @ts-expect-error
      Object.entries(body.aggregations).forEach(([aggName, { doc_count: docCount, value }]) => {
        const empty = docCount / totalDocs;

        if (docCount > 0 && empty > FRACTION_EMPTY_LIMIT) {
          emptyFields.push(aggName);

          if (aggName === depVar) {
            depVarValid = false;
            dependentVarWarningMessage.text = i18n.translate(
              'xpack.ml.models.dfaValidation.messages.depVarEmptyWarning',
              {
                defaultMessage:
                  'The dependent variable has at least {percentEmpty}% empty values. It may be unsuitable for analysis.',
                values: { percentEmpty: percentEmptyLimit },
              }
            );
          }
        }

        if (aggName === `${depVar}_const`) {
          depVarCardinality = value;
          if (value === 1) {
            depVarValid = false;
            dependentVarWarningMessage.text = i18n.translate(
              'xpack.ml.models.dfaValidation.messages.depVarContsWarning',
              {
                defaultMessage:
                  'The dependent variable is a constant value. It may be unsuitable for analysis.',
              }
            );
          }
          if (depVarValid === true) {
            messages.push({
              id: 'dep_var_check',
              text: i18n.translate('xpack.ml.models.dfaValidation.messages.depVarSuccess', {
                defaultMessage: 'The dependent variable field contains useful values for analysis.',
              }),
              status: VALIDATION_STATUS.SUCCESS,
              heading: dependentVarHeading,
            });
          } else {
            messages.push(dependentVarWarningMessage);
          }
        }
      });
    }

    const regressionAndClassificationMessages = getRegressionAndClassificationMessage(
      analysisConfig,
      analysisType,
      totalDocs,
      depVarCardinality
    );
    messages.push(...regressionAndClassificationMessages);

    if (analyzedFields.length && analyzedFields.length > INCLUDED_FIELDS_THRESHOLD) {
      analysisFieldsNumHigh = true;
    }

    if (emptyFields.length) {
      analysisFieldsEmpty = true;
    }

    if (analysisFieldsEmpty || analysisFieldsNumHigh) {
      if (analysisFieldsEmpty && analysisFieldsNumHigh) {
        analysisFieldsWarningMessage.text = i18n.translate(
          'xpack.ml.models.dfaValidation.messages.analysisFieldsWarningText',
          {
            defaultMessage:
              'Some fields included for analysis have at least {percentEmpty}% empty values. The number of selected fields is high and may result in increased resource usage and long-running jobs.',
            values: { percentEmpty: percentEmptyLimit },
          }
        );
      } else if (analysisFieldsEmpty && !analysisFieldsNumHigh) {
        analysisFieldsWarningMessage.text = i18n.translate(
          'xpack.ml.models.dfaValidation.messages.analysisFieldsEmptyWarningText',
          {
            defaultMessage:
              'Some fields included for analysis have at least {percentEmpty}% empty values and may not be suitable for analysis.',
            values: { percentEmpty: percentEmptyLimit },
          }
        );
      } else {
        analysisFieldsWarningMessage.text = i18n.translate(
          'xpack.ml.models.dfaValidation.messages.analysisFieldsHighWarningText',
          {
            defaultMessage:
              'The number of selected fields is high and may result in increased resource usage and long-running jobs.',
          }
        );
      }
      messages.push(analysisFieldsWarningMessage);
    } else {
      messages.push({
        id: 'analysis_fields',
        text: i18n.translate('xpack.ml.models.dfaValidation.messages.analysisFieldsSuccessText', {
          defaultMessage:
            'The selected analysis fields are sufficiently populated and contain useful data for analysis.',
        }),
        status: VALIDATION_STATUS.SUCCESS,
        heading: analysisFieldsHeading,
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
        defaultMessage: 'Unable to validate job.',
      }),
    });
  }

  return messages;
}

export async function validateAnalyticsJob(
  client: IScopedClusterClient,
  job: DataFrameAnalyticsConfig
) {
  const messages = await getValidationCheckMessages(
    client.asCurrentUser,
    job.analyzed_fields.includes,
    job.source.index,
    job.analysis,
    job.source.query
  );
  return messages;
}
