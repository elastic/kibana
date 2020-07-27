/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
// @ts-ignore
import numeral from '@elastic/numeral';
import { isEmpty } from 'lodash';
import { isValidIndexName } from '../../../../../../../common/util/es_utils';

import { collapseLiteralStrings } from '../../../../../../../../../../src/plugins/es_ui_shared/public';

import { Action, ACTION } from './actions';
import { getInitialState, getJobConfigFromFormState, State } from './state';
import {
  isJobIdValid,
  validateModelMemoryLimitUnits,
} from '../../../../../../../common/util/job_utils';
import {
  composeValidators,
  maxLengthValidator,
  memoryInputValidator,
  requiredValidator,
} from '../../../../../../../common/util/validators';
import {
  JOB_ID_MAX_LENGTH,
  ALLOWED_DATA_UNITS,
} from '../../../../../../../common/constants/validation';
import {
  getDependentVar,
  getNumTopFeatureImportanceValues,
  getTrainingPercent,
  isRegressionAnalysis,
  isClassificationAnalysis,
  ANALYSIS_CONFIG_TYPE,
  NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '../../../../common/analytics';
import { indexPatterns } from '../../../../../../../../../../src/plugins/data/public';

const mmlAllowedUnitsStr = `${ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(
  ', '
)} or ${[...ALLOWED_DATA_UNITS].pop()}`;

export const mmlUnitInvalidErrorMessage = i18n.translate(
  'xpack.ml.dataframe.analytics.create.modelMemoryUnitsInvalidError',
  {
    defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
    values: { str: mmlAllowedUnitsStr },
  }
);

/**
 * Returns the list of model memory limit errors based on validation result.
 * @param mmlValidationResult
 */
export function getModelMemoryLimitErrors(mmlValidationResult: any): string[] | null {
  if (mmlValidationResult === null) {
    return null;
  }

  return Object.keys(mmlValidationResult).reduce((acc, errorKey) => {
    if (errorKey === 'min') {
      acc.push(
        i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryUnitsMinError', {
          defaultMessage: 'Model memory limit cannot be lower than {mml}',
          values: {
            mml: mmlValidationResult.min.minValue,
          },
        })
      );
    }
    if (errorKey === 'invalidUnits') {
      acc.push(
        i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryUnitsInvalidError', {
          defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
          values: { str: mmlAllowedUnitsStr },
        })
      );
    }
    return acc;
  }, [] as string[]);
}

const getSourceIndexString = (state: State) => {
  const { jobConfig } = state;

  const sourceIndex = jobConfig?.source?.index;

  if (typeof sourceIndex === 'string') {
    return sourceIndex;
  }

  if (Array.isArray(sourceIndex)) {
    return sourceIndex.join(',');
  }

  return '';
};

/**
 * Validates num_top_feature_importance_values. Must be an integer >= 0.
 */
export const validateNumTopFeatureImportanceValues = (
  numTopFeatureImportanceValues: any
): boolean => {
  return (
    typeof numTopFeatureImportanceValues === 'number' &&
    numTopFeatureImportanceValues >= NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN &&
    Number.isInteger(numTopFeatureImportanceValues)
  );
};

export const validateAdvancedEditor = (state: State): State => {
  const { jobIdEmpty, jobIdValid, jobIdExists, jobType, createIndexPattern, includes } = state.form;
  const { jobConfig } = state;

  state.advancedEditorMessages = [];

  const sourceIndexName = getSourceIndexString(state);
  const sourceIndexNameEmpty = sourceIndexName === '';
  // general check against Kibana index pattern names, but since this is about the advanced editor
  // with support for arrays in the job config, we also need to check that each individual name
  // doesn't include a comma if index names are supplied as an array.
  // `indexPatterns.validate()` returns a map of messages, we're only interested here if it's valid or not.
  // If there are no messages, it means the index pattern is valid.
  let sourceIndexNameValid = Object.keys(indexPatterns.validate(sourceIndexName)).length === 0;
  const sourceIndex = jobConfig?.source?.index;
  if (sourceIndexNameValid) {
    if (typeof sourceIndex === 'string') {
      sourceIndexNameValid = !sourceIndex.includes(',');
    }
    if (Array.isArray(sourceIndex)) {
      sourceIndexNameValid = !sourceIndex.some((d) => d?.includes(','));
    }
  }

  const destinationIndexName = jobConfig?.dest?.index ?? '';
  const destinationIndexNameEmpty = destinationIndexName === '';
  const destinationIndexNameValid = isValidIndexName(destinationIndexName);
  const destinationIndexPatternTitleExists =
    state.indexPatternsMap[destinationIndexName] !== undefined;

  const resultsFieldEmptyString =
    typeof jobConfig?.dest?.results_field === 'string' &&
    jobConfig?.dest?.results_field.trim() === '';

  const mml = jobConfig.model_memory_limit;
  const modelMemoryLimitEmpty = mml === '' || mml === undefined;
  if (!modelMemoryLimitEmpty && mml !== undefined) {
    const { valid } = validateModelMemoryLimitUnits(mml);
    state.form.modelMemoryLimitUnitValid = valid;
  }

  let dependentVariableEmpty = false;
  let includesValid = true;
  let trainingPercentValid = true;
  let numTopFeatureImportanceValuesValid = true;

  if (
    jobConfig.analysis === undefined &&
    (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION || jobType === ANALYSIS_CONFIG_TYPE.REGRESSION)
  ) {
    dependentVariableEmpty = true;
  }

  if (
    jobConfig.analysis !== undefined &&
    (isRegressionAnalysis(jobConfig.analysis) || isClassificationAnalysis(jobConfig.analysis))
  ) {
    const dependentVariableName = getDependentVar(jobConfig.analysis) || '';
    dependentVariableEmpty = dependentVariableName === '';

    if (
      !dependentVariableEmpty &&
      includes !== undefined &&
      includes.length > 0 &&
      !includes.includes(dependentVariableName)
    ) {
      includesValid = false;

      state.advancedEditorMessages.push({
        error: i18n.translate(
          'xpack.ml.dataframe.analytics.create.advancedEditorMessage.includesInvalid',
          {
            defaultMessage: 'The dependent variable must be included.',
          }
        ),
        message: '',
      });
    }

    const trainingPercent = getTrainingPercent(jobConfig.analysis);
    if (
      trainingPercent !== undefined &&
      (isNaN(trainingPercent) ||
        typeof trainingPercent !== 'number' ||
        trainingPercent < TRAINING_PERCENT_MIN ||
        trainingPercent > TRAINING_PERCENT_MAX)
    ) {
      trainingPercentValid = false;

      state.advancedEditorMessages.push({
        error: i18n.translate(
          'xpack.ml.dataframe.analytics.create.advancedEditorMessage.trainingPercentInvalid',
          {
            defaultMessage: 'The training percent must be a number between {min} and {max}.',
            values: {
              min: TRAINING_PERCENT_MIN,
              max: TRAINING_PERCENT_MAX,
            },
          }
        ),
        message: '',
      });
    }

    const numTopFeatureImportanceValues = getNumTopFeatureImportanceValues(jobConfig.analysis);
    if (numTopFeatureImportanceValues !== undefined) {
      numTopFeatureImportanceValuesValid = validateNumTopFeatureImportanceValues(
        numTopFeatureImportanceValues
      );
      if (numTopFeatureImportanceValuesValid === false) {
        state.advancedEditorMessages.push({
          error: i18n.translate(
            'xpack.ml.dataframe.analytics.create.advancedEditorMessage.numTopFeatureImportanceValuesInvalid',
            {
              defaultMessage:
                'The value for num_top_feature_importance_values must be an integer of {min} or higher.',
              values: {
                min: 0,
              },
            }
          ),
          message: '',
        });
      }
    }
  }

  if (sourceIndexNameEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.sourceIndexNameEmpty',
        {
          defaultMessage: 'The source index name must not be empty.',
        }
      ),
      message: '',
    });
  } else if (!sourceIndexNameValid) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.sourceIndexNameValid',
        {
          defaultMessage: 'Invalid source index name.',
        }
      ),
      message: '',
    });
  }

  if (destinationIndexNameEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.destinationIndexNameEmpty',
        {
          defaultMessage: 'The destination index name must not be empty.',
        }
      ),
      message: '',
    });
  } else if (destinationIndexPatternTitleExists && !createIndexPattern) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.destinationIndexNameExistsWarn',
        {
          defaultMessage:
            'An index with this destination index name already exists. Be aware that running this analytics job will modify this destination index.',
        }
      ),
      message: '',
    });
  } else if (!destinationIndexNameValid) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.destinationIndexNameValid',
        {
          defaultMessage: 'Invalid destination index name.',
        }
      ),
      message: '',
    });
  }

  if (resultsFieldEmptyString) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.resultsFieldEmptyString',
        {
          defaultMessage: 'The results field must not be an empty string.',
        }
      ),
      message: '',
    });
  }

  if (dependentVariableEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.dependentVariableEmpty',
        {
          defaultMessage: 'The dependent variable field must not be empty.',
        }
      ),
      message: '',
    });
  }

  if (modelMemoryLimitEmpty) {
    state.advancedEditorMessages.push({
      error: i18n.translate(
        'xpack.ml.dataframe.analytics.create.advancedEditorMessage.modelMemoryLimitEmpty',
        {
          defaultMessage: 'The model memory limit field must not be empty.',
        }
      ),
      message: '',
    });
  }

  if (!state.form.modelMemoryLimitUnitValid) {
    state.advancedEditorMessages.push({
      error: mmlUnitInvalidErrorMessage,
      message: '',
    });
  }

  state.form.destinationIndexPatternTitleExists = destinationIndexPatternTitleExists;

  state.isValid =
    includesValid &&
    trainingPercentValid &&
    state.form.modelMemoryLimitUnitValid &&
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    !resultsFieldEmptyString &&
    !dependentVariableEmpty &&
    !modelMemoryLimitEmpty &&
    numTopFeatureImportanceValuesValid &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  return state;
};

/**
 * Validates provided MML isn't lower than the estimated one.
 */
export function validateMinMML(estimatedMml: string) {
  return (mml: string) => {
    if (!mml || !estimatedMml) {
      return null;
    }

    // @ts-ignore
    const mmlInBytes = numeral(mml.toUpperCase()).value();
    // @ts-ignore
    const estimatedMmlInBytes = numeral(estimatedMml.toUpperCase()).value();

    return estimatedMmlInBytes > mmlInBytes
      ? { min: { minValue: estimatedMml, actualValue: mml } }
      : null;
  };
}

/**
 * Result validator function for the MML.
 * Re-init only if the estimated mml has been changed.
 */
const mmlValidator = memoize((estimatedMml: string) =>
  composeValidators(requiredValidator(), validateMinMML(estimatedMml), memoryInputValidator())
);

const validateMml = memoize(
  (estimatedMml: string, mml: string | undefined) => mmlValidator(estimatedMml)(mml),
  (...args: any) => args.join('_')
);

const validateForm = (state: State): State => {
  const {
    jobIdEmpty,
    jobIdValid,
    jobIdExists,
    jobType,
    sourceIndexNameEmpty,
    sourceIndexNameValid,
    destinationIndexNameEmpty,
    destinationIndexNameValid,
    destinationIndexPatternTitleExists,
    createIndexPattern,
    dependentVariable,
    modelMemoryLimit,
    numTopFeatureImportanceValuesValid,
  } = state.form;
  const { estimatedModelMemoryLimit } = state;

  const jobTypeEmpty = jobType === undefined;
  const dependentVariableEmpty =
    (jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
      jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) &&
    dependentVariable === '';

  const mmlValidationResult = validateMml(estimatedModelMemoryLimit, modelMemoryLimit);

  state.form.modelMemoryLimitValidationResult = mmlValidationResult;

  state.isValid =
    !jobTypeEmpty &&
    !mmlValidationResult &&
    !jobIdEmpty &&
    jobIdValid &&
    !jobIdExists &&
    !sourceIndexNameEmpty &&
    sourceIndexNameValid &&
    !destinationIndexNameEmpty &&
    destinationIndexNameValid &&
    !dependentVariableEmpty &&
    numTopFeatureImportanceValuesValid &&
    (!destinationIndexPatternTitleExists || !createIndexPattern);

  return state;
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ACTION.ADD_REQUEST_MESSAGE:
      const requestMessages = state.requestMessages;
      requestMessages.push(action.requestMessage);
      return { ...state, requestMessages };

    case ACTION.RESET_REQUEST_MESSAGES:
      return { ...state, requestMessages: [] };

    case ACTION.RESET_ADVANCED_EDITOR_MESSAGES:
      return { ...state, advancedEditorMessages: [] };

    case ACTION.RESET_FORM:
      return getInitialState();

    case ACTION.SET_ADVANCED_EDITOR_RAW_STRING:
      let resultJobConfig;
      try {
        resultJobConfig = JSON.parse(collapseLiteralStrings(action.advancedEditorRawString));
      } catch (e) {
        return {
          ...state,
          advancedEditorRawString: action.advancedEditorRawString,
          isAdvancedEditorValidJson: false,
          advancedEditorMessages: [],
        };
      }

      return {
        ...validateAdvancedEditor({ ...state, jobConfig: resultJobConfig }),
        advancedEditorRawString: action.advancedEditorRawString,
        isAdvancedEditorValidJson: true,
      };

    case ACTION.SET_FORM_STATE:
      const newFormState = { ...state.form, ...action.payload };

      // update state attributes which are derived from other state attributes.
      if (action.payload.destinationIndex !== undefined) {
        newFormState.destinationIndexNameEmpty = newFormState.destinationIndex === '';
        newFormState.destinationIndexNameValid = isValidIndexName(newFormState.destinationIndex);
        newFormState.destinationIndexPatternTitleExists =
          state.indexPatternsMap[newFormState.destinationIndex] !== undefined;
      }

      if (action.payload.jobId !== undefined) {
        newFormState.jobIdExists = state.jobIds.some((id) => newFormState.jobId === id);
        newFormState.jobIdEmpty = newFormState.jobId === '';
        newFormState.jobIdValid = isJobIdValid(newFormState.jobId);
        newFormState.jobIdInvalidMaxLength = !!maxLengthValidator(JOB_ID_MAX_LENGTH)(
          newFormState.jobId
        );
      }

      if (action.payload.sourceIndex !== undefined) {
        newFormState.sourceIndexNameEmpty = newFormState.sourceIndex === '';
        const validationMessages = indexPatterns.validate(newFormState.sourceIndex);
        newFormState.sourceIndexNameValid = Object.keys(validationMessages).length === 0;
      }

      if (action.payload.numTopFeatureImportanceValues !== undefined) {
        newFormState.numTopFeatureImportanceValuesValid = validateNumTopFeatureImportanceValues(
          newFormState?.numTopFeatureImportanceValues
        );
      }

      return state.isAdvancedEditorEnabled
        ? validateAdvancedEditor({ ...state, form: newFormState })
        : validateForm({ ...state, form: newFormState });

    case ACTION.SET_INDEX_PATTERN_TITLES: {
      const newState = {
        ...state,
        ...action.payload,
      };
      newState.form.destinationIndexPatternTitleExists =
        newState.indexPatternsMap[newState.form.destinationIndex] !== undefined;
      return newState;
    }

    case ACTION.SET_IS_JOB_CREATED:
      return { ...state, isJobCreated: action.isJobCreated };

    case ACTION.SET_IS_JOB_STARTED:
      return { ...state, isJobStarted: action.isJobStarted };

    case ACTION.SET_JOB_CONFIG:
      return validateAdvancedEditor({ ...state, jobConfig: action.payload });

    case ACTION.SET_JOB_IDS: {
      const newState = { ...state, jobIds: action.jobIds };
      newState.form.jobIdExists = newState.jobIds.some((id) => newState.form.jobId === id);
      return newState;
    }

    case ACTION.SWITCH_TO_ADVANCED_EDITOR:
      let { jobConfig } = state;
      const isJobConfigEmpty = isEmpty(state.jobConfig);
      if (isJobConfigEmpty) {
        jobConfig = getJobConfigFromFormState(state.form);
      }
      return validateAdvancedEditor({
        ...state,
        advancedEditorRawString: JSON.stringify(jobConfig, null, 2),
        isAdvancedEditorEnabled: true,
        jobConfig,
      });

    case ACTION.SET_ESTIMATED_MODEL_MEMORY_LIMIT:
      return {
        ...state,
        estimatedModelMemoryLimit: action.value,
      };

    case ACTION.SET_JOB_CLONE:
      return {
        ...state,
        cloneJob: action.cloneJob,
      };
  }

  return state;
}
