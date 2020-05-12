/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useRef } from 'react';
import { EuiComboBox, EuiFormRow, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public'; // indexPatterns

import {
  DfAnalyticsExplainResponse,
  FieldSelectionItem,
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '../../../../common/analytics';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../../../analytics_management/components/create_analytics_form/messages';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  getJobConfigFromFormState,
  State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import {
  OMIT_FIELDS,
  shouldAddAsDepVarOption,
} from '../../../analytics_management/components/create_analytics_form/form_options_validation';
import { ml } from '../../../../../services/ml_api_service';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { JobType } from './job_type';
import { AnalysisFieldsTable } from './analysis_fields_table';

const requiredFieldsErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.requiredFieldsErrorMessage',
  {
    defaultMessage: 'At least one field must be included in the analysis.',
  }
);

export const ConfigurationStepForm: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

  const { initiateWizard, setEstimatedModelMemoryLimit, setFormState } = actions;
  const { estimatedModelMemoryLimit, form, isJobCreated, requestMessages } = state;
  const firstUpdate = useRef<boolean>(true);
  const {
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    excludes,
    excludesTableItems,
    fieldOptionsFetchFail,
    jobType,
    loadingDepVarOptions,
    loadingFieldOptions,
    maxDistinctValuesError,
    modelMemoryLimit,
    previousJobType,
    requiredFieldsError,
    sourceIndexContainsNumericalFields,
    trainingPercent,
  } = form;

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const dependentVariableEmpty = isJobTypeWithDepVar && dependentVariable === '';

  const isStepInvalid =
    dependentVariableEmpty ||
    jobType === undefined ||
    maxDistinctValuesError !== undefined ||
    requiredFieldsError !== undefined;

  // Find out if index pattern contain numeric fields. Provides a hint in the form
  // that an analytics jobs is not able to identify outliers if there are no numeric fields present.
  const validateSourceIndexFields = async () => {
    if (currentIndexPattern && currentIndexPattern.id) {
      try {
        const indexPattern: IndexPattern = await mlContext.indexPatterns.get(
          currentIndexPattern.id
        );
        const containsNumericalFields: boolean = indexPattern.fields.some(
          ({ name, type }) => !OMIT_FIELDS.includes(name) && type === 'number'
        );

        setFormState({
          sourceIndexContainsNumericalFields: containsNumericalFields,
          sourceIndexFieldsCheckFailed: false,
        });
      } catch (e) {
        setFormState({
          sourceIndexFieldsCheckFailed: true,
        });
      }
    }
  };

  const loadDepVarOptions = async (formState: State['form']) => {
    setFormState({
      loadingDepVarOptions: true,
      // clear when the source index changes
      maxDistinctValuesError: undefined,
      sourceIndexFieldsCheckFailed: false,
      sourceIndexContainsNumericalFields: true,
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

        await newJobCapsService.initializeFromIndexPattern(currentIndexPattern, false, false);
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
      let errorMessage;
      if (
        jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
        e.body &&
        e.body.message !== undefined &&
        e.body.message.includes('status_exception') &&
        e.body.message.includes('must have at most')
      ) {
        errorMessage = e.body.message;
      }
      const fallbackModelMemoryLimit =
        jobType !== undefined
          ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
          : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection;
      setEstimatedModelMemoryLimit(fallbackModelMemoryLimit);
      setFormState({
        fieldOptionsFetchFail: true,
        maxDistinctValuesError: errorMessage,
        loadingFieldOptions: false,
        ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: fallbackModelMemoryLimit } : {}),
      });
    }
  }, 400);

  useEffect(() => {
    initiateWizard();
  }, []);

  useEffect(() => {
    // TODO: validation check or set callout with link back to management page
    // disable form if source index doesn't have any of the supported fields
    setFormState({ sourceIndex: currentIndexPattern.title });
    validateSourceIndexFields();
  }, []);

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
  }, [jobType, dependentVariable, trainingPercent, JSON.stringify(excludes)]);

  return (
    <Fragment>
      <Messages messages={requestMessages} />
      <EuiFormRow
        fullWidth
        helpText={
          !sourceIndexContainsNumericalFields &&
          i18n.translate('xpack.ml.dataframe.analytics.create.sourceObjectHelpText', {
            defaultMessage:
              'This index pattern does not contain any numeric type fields. The analytics job may not be able to come up with any outliers.',
          })
        }
        // isInvalid={!sourceIndexNameValid}
        // error={getSourceIndexErrorMessages()}
      >
        <Fragment />
      </EuiFormRow>
      <JobType type={jobType} setFormState={setFormState} />
      {/* <SourceIndexPreview /> */}
      {isJobTypeWithDepVar && (
        <Fragment>
          <EuiFormRow
            fullWidth
            isInvalid={maxDistinctValuesError !== undefined}
            error={[
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
            <Fragment />
          </EuiFormRow>
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
              onChange={selectedOptions =>
                setFormState({
                  dependentVariable: selectedOptions[0].label || '',
                })
              }
              isClearable={false}
              isInvalid={dependentVariable === ''}
              data-test-subj="mlAnalyticsCreateJobFlyoutDependentVariableSelect"
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
      <AnalysisFieldsTable
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
              'Defines what percentage of the eligible documents that will be used for training',
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
            onChange={e => setFormState({ trainingPercent: +e.target.value })}
            data-test-subj="mlAnalyticsCreateJobFlyoutTrainingPercentSlider"
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
