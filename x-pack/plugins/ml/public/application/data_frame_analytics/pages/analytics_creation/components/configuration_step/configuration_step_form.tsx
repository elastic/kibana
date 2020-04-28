/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useRef } from 'react';
import { EuiComboBox, EuiFormRow, EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';

import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { useMlContext } from '../../../../../contexts/ml';

import {
  DfAnalyticsExplainResponse,
  ANALYSIS_CONFIG_TYPE,
  TRAINING_PERCENT_MIN,
  TRAINING_PERCENT_MAX,
} from '../../../../common/analytics';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import {
  DEFAULT_MODEL_MEMORY_LIMIT,
  getJobConfigFromFormState,
  State,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { shouldAddAsDepVarOption } from '../../../analytics_management/components/create_analytics_form/form_options_validation';
import { ml } from '../../../../../services/ml_api_service';
import { JobType } from './job_type';
import { AnalysisFieldsTable } from './analysis_fields_table';

export const ConfigurationStepForm: FC<CreateAnalyticsFormProps> = ({ actions, state }) => {
  const mlContext = useMlContext();
  const { currentIndexPattern: indexPattern } = mlContext;

  const { setEstimatedModelMemoryLimit, setFormState } = actions;
  const { estimatedModelMemoryLimit, form, isJobCreated } = state;
  const firstUpdate = useRef<boolean>(true);
  const {
    dependentVariable,
    dependentVariableFetchFail,
    dependentVariableOptions,
    excludes,
    excludesTableItems,
    jobType,
    loadingDepVarOptions,
    loadingFieldOptions,
    maxDistinctValuesError,
    modelMemoryLimit,
    previousJobType,
    trainingPercent,
  } = form;

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const loadDepVarOptions = async (formState: State['form']) => {
    setFormState({
      loadingDepVarOptions: true,
      // clear when the source index changes
      maxDistinctValuesError: undefined,
      sourceIndexFieldsCheckFailed: false,
      sourceIndexContainsNumericalFields: true,
    });
    try {
      if (indexPattern !== undefined) {
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

        await newJobCapsService.initializeFromIndexPattern(indexPattern, false, false);
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
    const shouldUpdateModelMemoryLimit = !firstUpdate.current || !modelMemoryLimit;
    const shouldUpdateEstimatedMml =
      !firstUpdate.current || !modelMemoryLimit || estimatedModelMemoryLimit === '';

    if (firstUpdate.current) {
      firstUpdate.current = false;
    }
    // Reset if jobType changes (jobType requires dependent_variable to be set -
    // which won't be the case if switching from outlier detection)
    if (previousJobType !== jobType) {
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

      // If sourceIndex has changed load analysis field options again
      if (previousJobType !== jobType) {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
          excludesTableItems: resp.field_selection ? resp.field_selection : [],
          loadingFieldOptions: false,
          fieldOptionsFetchFail: false,
          maxDistinctValuesError: undefined,
        });
      } else {
        setFormState({
          ...(shouldUpdateModelMemoryLimit ? { modelMemoryLimit: expectedMemoryWithoutDisk } : {}),
        });
      }
    } catch (e) {
      let errorMessage;
      if (
        jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
        e.message !== undefined &&
        e.message.includes('status_exception') &&
        e.message.includes('must have at most')
      ) {
        errorMessage = e.message;
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
    // TODO: set source Index after validation check or set callout with link back to selection
    // disable form if source index doesn't have the fields we need
    setFormState({ sourceIndex: indexPattern.title });
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
      <JobType type={jobType} setFormState={setFormState} />
      {/* <SourceIndexPreview /> */}
      {isJobTypeWithDepVar && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.ml.dataframe.analytics.create.dependentVariableLabel', {
            defaultMessage: 'Dependent variable',
          })}
          helpText={
            dependentVariableOptions.length === 0 &&
            dependentVariableFetchFail === false &&
            indexPattern &&
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
      )}
      <AnalysisFieldsTable
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
    </Fragment>
  );
};
