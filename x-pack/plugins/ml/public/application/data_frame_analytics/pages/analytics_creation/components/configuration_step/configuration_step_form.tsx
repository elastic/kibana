/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useRef } from 'react';
import { EuiBadge, EuiComboBox, EuiFormRow, EuiRange, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';

import {
  DfAnalyticsExplainResponse,
  FieldSelectionItem,
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '../../../../common/analytics';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../shared';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  getJobConfigFromFormState,
  State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { shouldAddAsDepVarOption } from './form_options_validation';
import { ml } from '../../../../../services/ml_api_service';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { JobType } from './job_type';
import { SupportedFieldsMessage } from './supported_fields_message';
import { MemoizedAnalysisFieldsTable } from './analysis_fields_table';
import { DataGrid } from '../../../../../components/data_grid';
import { useIndexData } from '../../hooks';
import { ExplorationQueryBar } from '../../../analytics_exploration/components/exploration_query_bar';
import { useSavedSearch } from './use_saved_search';

const requiredFieldsErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.requiredFieldsErrorMessage',
  {
    defaultMessage: 'At least one field must be included in the analysis.',
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

  const { setEstimatedModelMemoryLimit, setFormState } = actions;
  const { estimatedModelMemoryLimit, form, isJobCreated, requestMessages } = state;
  const firstUpdate = useRef<boolean>(true);
  const {
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    excludes,
    excludesTableItems,
    fieldOptionsFetchFail,
    jobConfigQuery,
    jobConfigQueryString,
    jobType,
    loadingDepVarOptions,
    loadingFieldOptions,
    maxDistinctValuesError,
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
    requiredFieldsError !== undefined;

  const loadDepVarOptions = async (formState: State['form']) => {
    setFormState({
      loadingDepVarOptions: true,
      maxDistinctValuesError: undefined,
    });
    try {
      if (currentIndexPattern !== undefined) {
        const formStateUpdate: {
          loadingDepVarOptions: boolean;
          dependentVariableFetchFail: boolean;
          dependentVariableOptions: State['form']['dependentVariableOptions'];
          dependentVariable?: State['form']['dependentVariable'];
        } = {
          loadingDepVarOptions: false,
          dependentVariableFetchFail: false,
          dependentVariableOptions: [] as State['form']['dependentVariableOptions'],
        };

        // Get fields and filter for supported types for job type
        const { fields } = newJobCapsService;

        let resetDependentVariable = true;
        for (const field of fields) {
          if (shouldAddAsDepVarOption(field, jobType)) {
            formStateUpdate.dependentVariableOptions.push({
              label: field.id,
            });

            if (formState.dependentVariable === field.id) {
              resetDependentVariable = false;
            }
          }
        }

        if (resetDependentVariable) {
          formStateUpdate.dependentVariable = '';
        }

        setFormState(formStateUpdate);
      }
    } catch (e) {
      setFormState({ loadingDepVarOptions: false, dependentVariableFetchFail: true });
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
      setFormState({
        loadingFieldOptions: true,
      });
    }

    try {
      const jobConfig = getJobConfigFromFormState(form);
      delete jobConfig.dest;
      delete jobConfig.model_memory_limit;
      const resp: DfAnalyticsExplainResponse = await ml.dataFrameAnalytics.explainDataFrameAnalytics(
        jobConfig
      );
      const expectedMemoryWithoutDisk = resp.memory_estimation?.expected_memory_without_disk;

      if (shouldUpdateEstimatedMml) {
        setEstimatedModelMemoryLimit(expectedMemoryWithoutDisk);
      }

      const fieldSelection: FieldSelectionItem[] | undefined = resp.field_selection;

      let hasRequiredFields = false;
      if (fieldSelection) {
        for (let i = 0; i < fieldSelection.length; i++) {
          const field = fieldSelection[i];
          if (field.is_included === true && field.is_required === false) {
            hasRequiredFields = true;
            break;
          }
        }
      }

      // If job type has changed load analysis field options again
      if (jobTypeChanged) {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
          excludesTableItems: fieldSelection ? fieldSelection : [],
          loadingFieldOptions: false,
          fieldOptionsFetchFail: false,
          maxDistinctValuesError: undefined,
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      } else {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
          requiredFieldsError: !hasRequiredFields ? requiredFieldsErrorText : undefined,
        });
      }
    } catch (e) {
      let maxDistinctValuesErrorMessage;

      if (
        jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
        e.body &&
        e.body.message !== undefined &&
        e.body.message.includes('status_exception') &&
        (e.body.message.includes('must have at most') ||
          e.body.message.includes('must have at least'))
      ) {
        maxDistinctValuesErrorMessage = e.body.message;
      }

      if (
        e.body &&
        e.body.message !== undefined &&
        e.body.message.includes('status_exception') &&
        e.body.message.includes('Unable to estimate memory usage as no documents')
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
      setFormState({
        fieldOptionsFetchFail: true,
        maxDistinctValuesError: maxDistinctValuesErrorMessage,
        loadingFieldOptions: false,
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
  }, [jobType, dependentVariable, trainingPercent, JSON.stringify(excludes), jobConfigQueryString]);

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
        isInvalid={requiredFieldsError !== undefined}
        error={
          requiredFieldsError !== undefined && [
            i18n.translate('xpack.ml.dataframe.analytics.create.requiredFieldsError', {
              defaultMessage: 'Invalid. {message}',
              values: { message: requiredFieldsError },
            }),
          ]
        }
      >
        <Fragment />
      </EuiFormRow>
      <MemoizedAnalysisFieldsTable
        excludes={excludes}
        tableItems={excludesTableItems}
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
