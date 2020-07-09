/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';

import {
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
  FieldSelectionItem,
} from '../../../../common/analytics';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../shared';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { shouldAddAsDepVarOption } from './form_options_validation';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { JobType } from './job_type';
import { SupportedFieldsMessage } from './supported_fields_message';
import { AnalysisFieldsTable } from './analysis_fields_table';
import { DataGrid } from '../../../../../components/data_grid';
import { fetchExplainData } from '../shared';
import { useIndexData } from '../../hooks';
import { ExplorationQueryBar } from '../../../analytics_exploration/components/exploration_query_bar';
import { useSavedSearch } from './use_saved_search';

const requiredFieldsErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.requiredFieldsErrorMessage',
  {
    defaultMessage:
      'At least one field must be included in the analysis in addition to the dependent variable.',
  }
);

export const ConfigurationStepForm: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const mlContext = useMlContext();
  const { currentSavedSearch, currentIndexPattern } = mlContext;
  const { savedSearchQuery, savedSearchQueryStr } = useSavedSearch();

  const [loadingFieldOptions, setLoadingFieldOptions] = useState<boolean>(false);
  const [fieldOptionsFetchFail, setFieldOptionsFetchFail] = useState<boolean>(false);
  const [loadingDepVarOptions, setLoadingDepVarOptions] = useState<boolean>(false);
  const [dependentVariableFetchFail, setDependentVariableFetchFail] = useState<boolean>(false);
  const [dependentVariableOptions, setDependentVariableOptions] = useState<
    EuiComboBoxOptionOption[]
  >([]);
  const [includesTableItems, setIncludesTableItems] = useState<FieldSelectionItem[]>([]);
  const [maxDistinctValuesError, setMaxDistinctValuesError] = useState<string | undefined>();
  const [unsupportedFieldsError, setUnsupportedFieldsError] = useState<string | undefined>();

  const { setEstimatedModelMemoryLimit, setFormState } = actions;
  const { estimatedModelMemoryLimit, form, isJobCreated, requestMessages } = state;
  const firstUpdate = useRef<boolean>(true);
  const {
    dependentVariable,
    includes,
    jobConfigQuery,
    jobConfigQueryString,
    jobType,
    modelMemoryLimit,
    previousJobType,
    requiredFieldsError,
    sourceIndex,
    trainingPercent,
  } = form;

  const toastNotifications = getToastNotifications();

  const setJobConfigQuery = ({ query, queryString }: { query: any; queryString: string }) => {
    setFormState({ jobConfigQuery: query, jobConfigQueryString: queryString });
  };

  const indexData = useIndexData(
    currentIndexPattern,
    savedSearchQuery !== undefined ? savedSearchQuery : jobConfigQuery,
    toastNotifications
  );

  const indexPreviewProps = {
    ...indexData,
    dataTestSubj: 'mlAnalyticsCreationDataGrid',
    toastNotifications,
  };

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const dependentVariableEmpty = isJobTypeWithDepVar && dependentVariable === '';

  const isStepInvalid =
    dependentVariableEmpty ||
    jobType === undefined ||
    maxDistinctValuesError !== undefined ||
    requiredFieldsError !== undefined ||
    unsupportedFieldsError !== undefined;

  const loadDepVarOptions = async (formState: State['form']) => {
    setLoadingDepVarOptions(true);
    setMaxDistinctValuesError(undefined);

    try {
      if (currentIndexPattern !== undefined) {
        const depVarOptions = [];
        let depVarUpdate = dependentVariable;
        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsService;

        let resetDependentVariable = true;
        for (const field of fields) {
          if (shouldAddAsDepVarOption(field, jobType)) {
            depVarOptions.push({
              label: field.id,
            });

            if (formState.dependentVariable === field.id) {
              resetDependentVariable = false;
            }
          }
        }

        if (resetDependentVariable) {
          depVarUpdate = '';
        }
        setDependentVariableOptions(depVarOptions);
        setLoadingDepVarOptions(false);
        setDependentVariableFetchFail(false);
        setFormState({ dependentVariable: depVarUpdate });
      }
    } catch (e) {
      setLoadingDepVarOptions(false);
      setDependentVariableFetchFail(true);
    }
  };

  const debouncedGetExplainData = debounce(async () => {
    const jobTypeChanged = previousJobType !== jobType;
    const shouldUpdateModelMemoryLimit = !firstUpdate.current || !modelMemoryLimit;
    const shouldUpdateEstimatedMml =
      !firstUpdate.current || !modelMemoryLimit || estimatedModelMemoryLimit === '';

    if (firstUpdate.current) {
      firstUpdate.current = false;
    }
    // Reset if jobType changes (jobType requires dependent_variable to be set -
    // which won't be the case if switching from outlier detection)
    if (jobTypeChanged) {
      setLoadingFieldOptions(true);
    }

    const { success, expectedMemory, fieldSelection, errorMessage } = await fetchExplainData(form);

    if (success) {
      if (shouldUpdateEstimatedMml) {
        setEstimatedModelMemoryLimit(expectedMemory);
      }

      const hasRequiredFields = fieldSelection.some(
        (field) => field.is_included === true && field.is_required === false
      );

      if (jobTypeChanged) {
        setLoadingFieldOptions(false);
        setFieldOptionsFetchFail(false);
        setMaxDistinctValuesError(undefined);
        setUnsupportedFieldsError(undefined);
        setIncludesTableItems(fieldSelection ? fieldSelection : []);
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemory } : {}),
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      } else {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemory } : {}),
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      }
    } else {
      let maxDistinctValuesErrorMessage;
      let unsupportedFieldsErrorMessage;
      if (
        jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
        errorMessage.includes('status_exception') &&
        (errorMessage.includes('must have at most') || errorMessage.includes('must have at least'))
      ) {
        maxDistinctValuesErrorMessage = errorMessage;
      }

      if (errorMessage.includes('status_exception') && errorMessage.includes('unsupported type')) {
        unsupportedFieldsErrorMessage = errorMessage;
      }

      if (
        errorMessage.includes('status_exception') &&
        errorMessage.includes('Unable to estimate memory usage as no documents')
      ) {
        toastNotifications.addWarning(
          i18n.translate('xpack.ml.dataframe.analytics.create.allDocsMissingFieldsErrorMessage', {
            defaultMessage: `Unable to estimate memory usage. There are mapped fields for source index [{index}] that do not exist in any indexed documents. You will have to switch to the JSON editor for explicit field selection and include only fields that exist in indexed documents.`,
            values: {
              index: sourceIndex,
            },
          })
        );
      }

      const fallbackModelMemoryLimit =
        jobType !== undefined
          ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
          : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection;

      setEstimatedModelMemoryLimit(fallbackModelMemoryLimit);
      setLoadingFieldOptions(false);
      setFieldOptionsFetchFail(true);
      setMaxDistinctValuesError(maxDistinctValuesErrorMessage);
      setUnsupportedFieldsError(unsupportedFieldsErrorMessage);
      setFormState({
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: fallbackModelMemoryLimit } : {}),
      });
    }
  }, 300);

  useEffect(() => {
    setFormState({ sourceIndex: currentIndexPattern.title });
  }, []);

  useEffect(() => {
    if (savedSearchQueryStr !== undefined) {
      setFormState({ jobConfigQuery: savedSearchQuery, jobConfigQueryString: savedSearchQueryStr });
    }
  }, [JSON.stringify(savedSearchQuery), savedSearchQueryStr]);

  useEffect(() => {
    if (isJobTypeWithDepVar) {
      loadDepVarOptions(form);
    }
  }, [jobType]);

  useEffect(() => {
    const hasBasicRequiredFields = jobType !== undefined;

    const hasRequiredAnalysisFields =
      (isJobTypeWithDepVar && dependentVariable !== '') ||
      jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;

    if (hasBasicRequiredFields && hasRequiredAnalysisFields) {
      debouncedGetExplainData();
    }

    return () => {
      debouncedGetExplainData.cancel();
    };
  }, [jobType, dependentVariable, trainingPercent, JSON.stringify(includes), jobConfigQueryString]);

  return (
    <Fragment>
      <Messages messages={requestMessages} />
      <SupportedFieldsMessage jobType={jobType} />
      <JobType type={jobType} setFormState={setFormState} />
      {savedSearchQuery === undefined && (
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.sourceQueryLabel', {
            defaultMessage: 'Query',
          })}
          fullWidth
        >
          <ExplorationQueryBar
            indexPattern={currentIndexPattern}
            // @ts-ignore
            setSearchQuery={setJobConfigQuery}
            includeQueryString
            defaultQueryString={jobConfigQueryString}
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={
          <Fragment>
            {savedSearchQuery !== undefined && (
              <EuiText>
                {i18n.translate('xpack.ml.dataframe.analytics.create.savedSearchLabel', {
                  defaultMessage: 'Saved search',
                })}
              </EuiText>
            )}
            <EuiBadge color="hollow">
              {savedSearchQuery !== undefined
                ? currentSavedSearch?.attributes.title
                : currentIndexPattern.title}
            </EuiBadge>
          </Fragment>
        }
        fullWidth
      >
        <DataGrid {...indexPreviewProps} />
      </EuiFormRow>
      {isJobTypeWithDepVar && (
        <Fragment>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.ml.dataframe.analytics.create.dependentVariableLabel', {
              defaultMessage: 'Dependent variable',
            })}
            helpText={
              dependentVariableOptions.length === 0 &&
              dependentVariableFetchFail === false &&
              currentIndexPattern &&
              i18n.translate(
                'xpack.ml.dataframe.analytics.create.dependentVariableOptionsNoNumericalFields',
                {
                  defaultMessage: 'No numeric type fields were found for this index pattern.',
                }
              )
            }
            isInvalid={maxDistinctValuesError !== undefined}
            error={[
              ...(dependentVariableFetchFail === true
                ? [
                    <Fragment>
                      {i18n.translate(
                        'xpack.ml.dataframe.analytics.create.dependentVariableOptionsFetchError',
                        {
                          defaultMessage:
                            'There was a problem fetching fields. Please refresh the page and try again.',
                        }
                      )}
                    </Fragment>,
                  ]
                : []),
              ...(fieldOptionsFetchFail === true && maxDistinctValuesError !== undefined
                ? [
                    <Fragment>
                      {i18n.translate(
                        'xpack.ml.dataframe.analytics.create.dependentVariableMaxDistictValuesError',
                        {
                          defaultMessage: 'Invalid. {message}',
                          values: { message: maxDistinctValuesError },
                        }
                      )}
                    </Fragment>,
                  ]
                : []),
            ]}
          >
            <EuiComboBox
              fullWidth
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.dependentVariableInputAriaLabel',
                {
                  defaultMessage: 'Enter field to be used as dependent variable.',
                }
              )}
              placeholder={i18n.translate(
                'xpack.ml.dataframe.analytics.create.dependentVariablePlaceholder',
                {
                  defaultMessage: 'dependent variable',
                }
              )}
              isDisabled={isJobCreated}
              isLoading={loadingDepVarOptions}
              singleSelection={true}
              options={dependentVariableOptions}
              selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
              onChange={(selectedOptions) =>
                setFormState({
                  dependentVariable: selectedOptions[0].label || '',
                })
              }
              isClearable={false}
              isInvalid={dependentVariable === ''}
              data-test-subj="mlAnalyticsCreateJobWizardDependentVariableSelect"
            />
          </EuiFormRow>
        </Fragment>
      )}
      <EuiFormRow
        fullWidth
        isInvalid={requiredFieldsError !== undefined || unsupportedFieldsError !== undefined}
        error={[
          ...(requiredFieldsError !== undefined
            ? [
                i18n.translate('xpack.ml.dataframe.analytics.create.requiredFieldsError', {
                  defaultMessage: 'Invalid. {message}',
                  values: { message: requiredFieldsError },
                }),
              ]
            : []),
          ...(unsupportedFieldsError !== undefined
            ? [
                i18n.translate('xpack.ml.dataframe.analytics.create.unsupportedFieldsError', {
                  defaultMessage: 'Invalid. {message}',
                  values: { message: unsupportedFieldsError },
                }),
              ]
            : []),
        ]}
      >
        <Fragment />
      </EuiFormRow>
      <AnalysisFieldsTable
        dependentVariable={dependentVariable}
        includes={includes}
        tableItems={includesTableItems}
        loadingItems={loadingFieldOptions}
        setFormState={setFormState}
      />
      {isJobTypeWithDepVar && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentLabel', {
            defaultMessage: 'Training percent',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.trainingPercentHelpText', {
            defaultMessage:
              'Defines the percentage of eligible documents that will be used for training.',
          })}
        >
          <EuiRange
            fullWidth
            min={TRAINING_PERCENT_MIN}
            max={TRAINING_PERCENT_MAX}
            step={1}
            showLabels
            showRange
            showValue
            value={trainingPercent}
            // @ts-ignore Property 'value' does not exist on type 'EventTarget' | (EventTarget & HTMLInputElement)
            onChange={(e) => setFormState({ trainingPercent: +e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardTrainingPercentSlider"
          />
        </EuiFormRow>
      )}
      <EuiSpacer />
      <ContinueButton
        isDisabled={isStepInvalid}
        onClick={() => {
          setCurrentStep(ANALYTICS_STEPS.ADVANCED);
        }}
      />
    </Fragment>
  );
};
