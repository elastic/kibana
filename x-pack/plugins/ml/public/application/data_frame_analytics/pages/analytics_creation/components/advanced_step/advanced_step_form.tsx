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
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getModelMemoryLimitErrors } from '../../../analytics_management/hooks/use_create_analytics_form/reducer';
import {
  ANALYSIS_CONFIG_TYPE,
  NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN,
} from '../../../../common/analytics';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';

const MAX_TREES_LIMIT = 2000;

export const AdvancedStepForm: FC<CreateAnalyticsFormProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const { setFormState } = actions;
  const { form, isJobCreated } = state;
  const {
    computeFeatureInfluence,
    eta,
    featureBagFraction,
    featureInfluenceThreshold,
    gamma,
    jobType,
    lambda,
    method,
    maxTrees,
    modelMemoryLimit,
    modelMemoryLimitValidationResult,
    nNeighbors,
    numTopClasses,
    numTopFeatureImportanceValues,
    numTopFeatureImportanceValuesValid,
    outlierFraction,
    predictionFieldName,
    randomizeSeed,
    standardizationEnabled,
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
          <EuiFieldText
            disabled={false}
            value={computeFeatureInfluence}
            onChange={e => setFormState({ computeFeatureInfluence: e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardComputeFeatureInfluenceLabelInput"
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
                'The minimum outlier score that a document needs to have in order to calculate its feature influence score. Value range: 0-1.',
            }
          )}
        >
          <EuiFieldText
            disabled={false}
            value={featureInfluenceThreshold}
            onChange={e => setFormState({ featureInfluenceThreshold: +e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardFeatureInfluenceThresholdInput"
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
            disabled={false}
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

  const outlierDetectionHyperParams = (
    <Fragment>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.methodLabel', {
            defaultMessage: 'Method',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.methodHelpText', {
            defaultMessage:
              'Sets the method that outlier detection uses. If not set, uses an ensemble of different methods and normalises and combines their individual outlier scores to obtain the overall outlier score. We recommend to use the ensemble method',
          })}
        >
          <EuiFieldText
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.methodInputAriaLabel', {
              defaultMessage: 'Sets the method that outlier detection uses.',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardMethodInput"
            disabled={false}
            onChange={e => setFormState({ method: e.target.value })}
            step={1}
            value={method}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.nNeighborsLabel', {
            defaultMessage: 'N neighbors',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.nNeighborsHelpText', {
            defaultMessage:
              'The value for how many nearest neighbors each method of outlier detection will use to calculate its outlier score. When not set, different values will be used for different ensemble members.',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.nNeighborsInputAriaLabel',
              {
                defaultMessage:
                  'The value for how many nearest neighbors each method of outlier detection will use to calculate its outlier score.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardnNeighborsInput"
            disabled={false}
            onChange={e => setFormState({ nNeighbors: +e.target.value })}
            step={1}
            value={nNeighbors}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.outlierFractionLabel', {
            defaultMessage: 'Outlier fraction',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.outlierFractionHelpText', {
            defaultMessage:
              'Sets the proportion of the data set that is assumed to be outlying prior to outlier detection.',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.outlierFractionInputAriaLabel',
              {
                defaultMessage:
                  'Sets the proportion of the data set that is assumed to be outlying prior to outlier detection.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardoutlierFractionInput"
            disabled={false}
            onChange={e => setFormState({ outlierFraction: +e.target.value })}
            step={1}
            value={outlierFraction}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.standardizationEnabledLabel', {
            defaultMessage: 'Standardization enabled',
          })}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.standardizationEnabledHelpText',
            {
              defaultMessage:
                'If true, the following operation is performed on the columns before computing outlier scores: (x_i - mean(x_i)) / sd(x_i).',
            }
          )}
        >
          <EuiFieldText
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.standardizationEnabledInputAriaLabel',
              {
                defaultMessage: 'Sets standardization enabled setting.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardStandardizationEnabledInput"
            disabled={false}
            onChange={e => setFormState({ standardizationEnabled: e.target.value })}
            step={1}
            value={standardizationEnabled}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </Fragment>
  );

  const regAndClassHyperParams = (
    <Fragment>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaLabel', {
            defaultMessage: 'Lambda',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaHelpText', {
            defaultMessage:
              'Regularization parameter to prevent overfitting on the training data set',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaInputAriaLabel', {
              defaultMessage: 'Maximum number of feature importance values per document.',
            })}
            data-test-subj="mlAnalyticsCreateJobFlyoutLambdaInput"
            disabled={false}
            onChange={e => setFormState({ lambda: +e.target.value })}
            step={1}
            value={lambda}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesLabel', {
            defaultMessage: 'Max trees',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesText', {
            defaultMessage: 'The maximum number of trees the forest is allowed to contain',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.maxTreesInputAriaLabel',
              {
                defaultMessage: 'The maximum number of trees the forest is allowed to contain.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobFlyoutMaxTreesInput"
            disabled={false}
            onChange={e => setFormState({ maxTrees: +e.target.value })}
            step={1}
            max={MAX_TREES_LIMIT}
            value={maxTrees}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaLabel', {
            defaultMessage: 'Gamma',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.gammaText', {
            defaultMessage:
              'Multiplies a linear penalty associated with the size of individual trees in the forest',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaInputAriaLabel', {
              defaultMessage:
                'Multiplies a linear penalty associated with the size of individual trees in the forest',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardGammaInput"
            disabled={false}
            onChange={e => setFormState({ gamma: +e.target.value })}
            step={1}
            value={gamma}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.etaLabel', {
            defaultMessage: 'ETA',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.etaText', {
            defaultMessage: 'The shrinkage applied to the weights',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.etaInputAriaLabel', {
              defaultMessage: 'The shrinkage applied to the weights',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardEtaInput"
            disabled={false}
            onChange={e => setFormState({ eta: +e.target.value })}
            step={1}
            value={eta}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.featureBagFractionLabel', {
            defaultMessage: 'Feature bag fraction',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.featureBagFractionText', {
            defaultMessage:
              'The fraction of features used when selecting a random bag for each candidate split',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.featureBagFractionInputAriaLabel',
              {
                defaultMessage:
                  'The fraction of features used when selecting a random bag for each candidate split',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardFeatureBagFractionInput"
            disabled={false}
            onChange={e => setFormState({ featureBagFraction: +e.target.value })}
            step={1}
            value={featureBagFraction}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedLabel', {
            defaultMessage: 'Randomized seed',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedText', {
            defaultMessage:
              'The seed to the random generator that is used to pick which documents will be used for training',
          })}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.randomizeSeedInputAriaLabel',
              {
                defaultMessage:
                  'The seed to the random generator that is used to pick which documents will be used for training',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardRandomizeSeedInput"
            disabled={false}
            onChange={e => setFormState({ randomizeSeed: +e.target.value })}
            step={1}
            value={randomizeSeed}
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
                disabled={false}
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
          {jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && outlierDetectionHyperParams}
          {isRegOrClassJob && regAndClassHyperParams}
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
