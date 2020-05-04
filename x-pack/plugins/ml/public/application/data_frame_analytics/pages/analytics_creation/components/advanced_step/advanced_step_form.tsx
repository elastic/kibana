/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HyperParameters } from './hyper_parameters';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getModelMemoryLimitErrors } from '../../../analytics_management/hooks/use_create_analytics_form/reducer';
import {
  ANALYSIS_CONFIG_TYPE,
  NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN,
} from '../../../../common/analytics';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { OutlierHyperParameters } from './outlier_hyper_parameters';

export const AdvancedStepForm: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const { setFormState } = actions;
  const { form, isJobCreated } = state;
  const {
    computeFeatureInfluence,
    jobType,
    modelMemoryLimit,
    modelMemoryLimitValidationResult,
    numTopClasses,
    numTopFeatureImportanceValues,
    numTopFeatureImportanceValuesValid,
    predictionFieldName,
  } = form;

  const mmlErrors = useMemo(() => getModelMemoryLimitErrors(modelMemoryLimitValidationResult), [
    modelMemoryLimitValidationResult,
  ]);

  const isRegOrClassJob =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const mmlInvalid = modelMemoryLimitValidationResult !== null;

  const outlierDetectionAdvancedConfig = (
    <Fragment>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.computeFeatureInfluenceLabel',
            {
              defaultMessage: 'Compute feature influence',
            }
          )}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.computeFeatureInfluenceLabelHelpText',
            {
              defaultMessage:
                'Specifies whether the feature influence calculation is enabled. Defaults to true.',
            }
          )}
        >
          <EuiSelect
            data-test-subj="mlAnalyticsCreateJobWizardComputeFeatureInfluenceLabelInput"
            options={[
              {
                value: 'true',
                text: i18n.translate(
                  'xpack.ml.dataframe.analytics.create.computeFeatureInfluenceTrueValue',
                  {
                    defaultMessage: 'True',
                  }
                ),
              },
              {
                value: 'false',
                text: i18n.translate(
                  'xpack.ml.dataframe.analytics.create.computeFeatureInfluenceFalseValue',
                  {
                    defaultMessage: 'False',
                  }
                ),
              },
            ]}
            value={computeFeatureInfluence}
            hasNoInitialSelection={false}
            onChange={e => {
              setFormState({
                computeFeatureInfluence: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.featureInfluenceThresholdLabel',
            {
              defaultMessage: 'Feature influence threshold',
            }
          )}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.featureInfluenceThresholdHelpText',
            {
              defaultMessage:
                'The minimum outlier score that a document needs to have in order to calculate its feature influence score. Value range: 0-1. Defaults to 0.1',
            }
          )}
        >
          <EuiFieldNumber
            onChange={e => setFormState({ featureInfluenceThreshold: +e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardFeatureInfluenceThresholdInput"
            min={0}
            max={1}
            step={0.001}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </Fragment>
  );

  const regAndClassAdvancedConfig = (
    <Fragment>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesLabel',
            {
              defaultMessage: 'Feature importance values',
            }
          )}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesHelpText',
            {
              defaultMessage:
                'Specify the maximum number of feature importance values per document to return.',
            }
          )}
          isInvalid={numTopFeatureImportanceValuesValid === false}
          error={[
            ...(numTopFeatureImportanceValuesValid === false
              ? [
                  <Fragment>
                    {i18n.translate(
                      'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesErrorText',
                      {
                        defaultMessage: 'Invalid maximum number of feature importance values.',
                      }
                    )}
                  </Fragment>,
                ]
              : []),
          ]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.numTopFeatureImportanceValuesInputAriaLabel',
              {
                defaultMessage: 'Maximum number of feature importance values per document.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobFlyoutnumTopFeatureImportanceValuesInput"
            isInvalid={numTopFeatureImportanceValuesValid === false}
            min={NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN}
            onChange={e => setFormState({ numTopFeatureImportanceValues: +e.target.value })}
            step={1}
            value={numTopFeatureImportanceValues}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.predictionFieldNameLabel', {
            defaultMessage: 'Prediction field name',
          })}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.predictionFieldNameHelpText',
            {
              defaultMessage:
                'Defines the name of the prediction field in the results. Defaults to <dependent_variable>_prediction',
            }
          )}
        >
          <EuiFieldText
            disabled={isJobCreated}
            value={predictionFieldName}
            onChange={e => setFormState({ predictionFieldName: e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardPredictionFieldNameInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </Fragment>
  );

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ml.dataframe.analytics.create.advancedConfigSectionTitle', {
            defaultMessage: 'Advanced configuration',
          })}
        </h3>
      </EuiTitle>
      <EuiFlexGroup wrap>
        {jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && outlierDetectionAdvancedConfig}
        {isRegOrClassJob && regAndClassAdvancedConfig}
        {jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
          <EuiFlexItem style={{ minWidth: '30%' }}>
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.analytics.create.numTopClassesLabel', {
                defaultMessage: 'Top classes',
              })}
              helpText={i18n.translate(
                'xpack.ml.dataframe.analytics.create.numTopClassesHelpText',
                {
                  defaultMessage:
                    'The number of categories for which the predicted probabilities are reported',
                }
              )}
            >
              <EuiFieldNumber
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.numTopClassesInputAriaLabel',
                  {
                    defaultMessage:
                      'The number of categories for which the predicted probabilities are reported',
                  }
                )}
                data-test-subj="mlAnalyticsCreateJobWizardnumTopClassesInput"
                min={0}
                onChange={e => setFormState({ numTopClasses: +e.target.value })}
                step={1}
                value={numTopClasses}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem style={{ width: '30%', minWidth: '30%' }}>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryLimitLabel', {
              defaultMessage: 'Model memory limit',
            })}
            isInvalid={mmlInvalid}
            error={mmlErrors}
            helpText={i18n.translate(
              'xpack.ml.dataframe.analytics.create.modelMemoryLimitHelpText',
              {
                defaultMessage:
                  'The approximate maximum amount of memory resources that are permitted for analytical processing',
              }
            )}
          >
            <EuiFieldText
              placeholder={
                jobType !== undefined
                  ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
                  : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection
              }
              disabled={isJobCreated}
              value={modelMemoryLimit || ''}
              onChange={e => setFormState({ modelMemoryLimit: e.target.value })}
              isInvalid={mmlInvalid}
              data-test-subj="mlAnalyticsCreateJobWizardModelMemoryInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiAccordion
        id="hyper-parameters"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ml.dataframe.analytics.create.hyperParametersSectionTitle', {
                defaultMessage: 'Hyper parameters',
              })}
            </h3>
          </EuiTitle>
        }
        initialIsOpen={false}
        data-test-subj="mlAnalyticsCreateJobWizardHyperParametersSection"
      >
        <EuiFlexGroup wrap>
          {jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
            <OutlierHyperParameters actions={actions} state={state} />
          )}
          {isRegOrClassJob && <HyperParameters actions={actions} state={state} />}
        </EuiFlexGroup>
      </EuiAccordion>
      <EuiSpacer />
      <ContinueButton
        isDisabled={mmlInvalid}
        onClick={() => {
          setCurrentStep(ANALYTICS_STEPS.DETAILS);
        }}
      />
    </Fragment>
  );
};
