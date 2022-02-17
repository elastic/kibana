/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useMemo, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HyperParameters } from './hyper_parameters';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getModelMemoryLimitErrors } from '../../../analytics_management/hooks/use_create_analytics_form/reducer';
import {
  ANALYSIS_CONFIG_TYPE,
  NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN,
  ANALYSIS_ADVANCED_FIELDS,
} from '../../../../common/analytics';
import { useMlKibana } from '../../../../../contexts/kibana';
import { DEFAULT_MODEL_MEMORY_LIMIT } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
import { fetchExplainData } from '../shared';
import { ContinueButton } from '../continue_button';
import { OutlierHyperParameters } from './outlier_hyper_parameters';

const defaultNumTopClassesOption: EuiComboBoxOptionOption = {
  label: i18n.translate('xpack.ml.dataframe.analytics.create.allClassesLabel', {
    defaultMessage: 'All classes',
  }),
  value: -1,
};
const numClassesTypeMessage = (
  <FormattedMessage
    id="xpack.ml.dataframe.analytics.create.numTopClassTypeWarning"
    defaultMessage="Value must be an integer of -1 or greater, where -1 indicates all classes."
  />
);

function getZeroClassesMessage(elasticUrl: string) {
  return (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.create.zeroClassesMessage"
      defaultMessage="To evaluate the {wikiLink}, select all classes or a value greater than the total number of categories."
      values={{
        wikiLink: (
          <EuiLink href={elasticUrl} target="_blank" external>
            {i18n.translate('xpack.ml.dataframe.analytics.create.aucRocLabel', {
              defaultMessage: 'AUC ROC',
            })}
          </EuiLink>
        ),
      }}
    />
  );
}

function getTopClassesHelpText(currentNumTopClasses?: number) {
  if (currentNumTopClasses === -1) {
    return (
      <>
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.numTopClassesHelpText"
          defaultMessage="The number of categories for which the predicted probabilities are reported."
        />{' '}
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.allClassesMessage"
          defaultMessage="If you have a large number of classes there could be a significant effect on the size of your destination index."
        />
      </>
    );
  }
  return (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.create.numTopClassesHelpText"
      defaultMessage="The number of categories for which the predicted probabilities are reported."
    />
  );
}

function getSelectedNumTomClassesOption(currentNumTopClasses?: number) {
  const option: EuiComboBoxOptionOption[] = [];
  if (currentNumTopClasses === -1) {
    option.push(defaultNumTopClassesOption);
  } else if (currentNumTopClasses !== undefined) {
    option.push({
      label: `${currentNumTopClasses}`,
    });
  }
  return option;
}

function isInvalidNumTopClasses(currentNumTopClasses?: number) {
  // Only valid if undefined or a whole integer >= -1
  return (
    currentNumTopClasses !== undefined &&
    (isNaN(currentNumTopClasses) ||
      currentNumTopClasses < -1 ||
      currentNumTopClasses - Math.floor(currentNumTopClasses) !== 0)
  );
}

export function getNumberValue(value?: number) {
  return value === undefined ? '' : +value;
}

export type AdvancedParamErrors = {
  [key in ANALYSIS_ADVANCED_FIELDS]?: string;
};

export const AdvancedStepForm: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const [advancedParamErrors, setAdvancedParamErrors] = useState<AdvancedParamErrors>({});
  const [fetchingAdvancedParamErrors, setFetchingAdvancedParamErrors] = useState<boolean>(false);

  const {
    services: { docLinks },
  } = useMlKibana();
  const classAucRocDocLink = docLinks.links.ml.classificationAucRoc;

  const { setEstimatedModelMemoryLimit, setFormState } = actions;
  const { form, isJobCreated, estimatedModelMemoryLimit } = state;
  const {
    alpha,
    computeFeatureInfluence,
    downsampleFactor,
    eta,
    etaGrowthRatePerTree,
    featureBagFraction,
    featureInfluenceThreshold,
    gamma,
    jobType,
    lambda,
    maxNumThreads,
    maxOptimizationRoundsPerHyperparameter,
    maxTrees,
    method,
    modelMemoryLimit,
    modelMemoryLimitValidationResult,
    nNeighbors,
    numTopClasses,
    numTopFeatureImportanceValues,
    numTopFeatureImportanceValuesValid,
    outlierFraction,
    predictionFieldName,
    randomizeSeed,
    softTreeDepthLimit,
    softTreeDepthTolerance,
    useEstimatedMml,
  } = form;

  const [numTopClassesOptions, setNumTopClassesOptions] = useState<EuiComboBoxOptionOption[]>([
    defaultNumTopClassesOption,
  ]);
  const [numTopClassesSelectedOptions, setNumTopClassesSelectedOptions] = useState<
    EuiComboBoxOptionOption[]
  >(getSelectedNumTomClassesOption(numTopClasses));

  const selectedNumTopClasses =
    numTopClassesSelectedOptions[0] &&
    ((numTopClassesSelectedOptions[0].value ?? Number(numTopClassesSelectedOptions[0].label)) as
      | number
      | undefined);

  const selectedNumTopClassesIsInvalid = isInvalidNumTopClasses(selectedNumTopClasses);

  const mmlErrors = useMemo(
    () => getModelMemoryLimitErrors(modelMemoryLimitValidationResult),
    [modelMemoryLimitValidationResult]
  );

  const isRegOrClassJob =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const mmlInvalid =
    modelMemoryLimitValidationResult !== null &&
    (modelMemoryLimitValidationResult.invalidUnits !== undefined ||
      modelMemoryLimitValidationResult.required === true);

  const isStepInvalid =
    selectedNumTopClassesIsInvalid ||
    mmlInvalid ||
    Object.keys(advancedParamErrors).length > 0 ||
    fetchingAdvancedParamErrors === true ||
    maxNumThreads === 0;

  useEffect(() => {
    setFetchingAdvancedParamErrors(true);
    (async function () {
      const { success, errorMessage, errorReason, expectedMemory } = await fetchExplainData(form);
      const paramErrors: AdvancedParamErrors = {};

      if (success) {
        if (modelMemoryLimit !== expectedMemory) {
          setEstimatedModelMemoryLimit(expectedMemory);
          if (useEstimatedMml === true) {
            setFormState({ modelMemoryLimit: expectedMemory });
          }
        }
      } else {
        // Check which field is invalid
        Object.values(ANALYSIS_ADVANCED_FIELDS).forEach((param) => {
          if (errorMessage.includes(`[${param}]`)) {
            paramErrors[param] = errorMessage;
          } else if (errorReason?.includes(`[${param}]`)) {
            paramErrors[param] = errorReason;
          }
        });
      }
      setFetchingAdvancedParamErrors(false);
      setAdvancedParamErrors(paramErrors);
    })();
  }, [
    alpha,
    downsampleFactor,
    eta,
    etaGrowthRatePerTree,
    featureBagFraction,
    featureInfluenceThreshold,
    gamma,
    lambda,
    maxNumThreads,
    maxOptimizationRoundsPerHyperparameter,
    maxTrees,
    method,
    nNeighbors,
    numTopClasses,
    numTopFeatureImportanceValues,
    outlierFraction,
    randomizeSeed,
    softTreeDepthLimit,
    softTreeDepthTolerance,
  ]);

  const outlierDetectionAdvancedConfig = (
    <Fragment>
      <EuiFlexItem>
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
            onChange={(e) => {
              setFormState({
                computeFeatureInfluence: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
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
                'The minimum outlier score that a document needs to have in order to calculate its feature influence score. Value range: 0-1. Defaults to 0.1.',
            }
          )}
          isInvalid={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.FEATURE_INFLUENCE_THRESHOLD] !== undefined
          }
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.FEATURE_INFLUENCE_THRESHOLD]}
        >
          <EuiFieldNumber
            onChange={(e) =>
              setFormState({
                featureInfluenceThreshold: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            data-test-subj="mlAnalyticsCreateJobWizardFeatureInfluenceThresholdInput"
            min={0}
            max={1}
            step={0.001}
            value={getNumberValue(featureInfluenceThreshold)}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </Fragment>
  );

  const regAndClassAdvancedConfig = (
    <Fragment>
      <EuiFlexItem>
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
            onChange={(e) =>
              setFormState({
                numTopFeatureImportanceValues: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            step={1}
            value={getNumberValue(numTopFeatureImportanceValues)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.predictionFieldNameLabel', {
            defaultMessage: 'Prediction field name',
          })}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.predictionFieldNameHelpText',
            {
              defaultMessage:
                'Defines the name of the prediction field in the results. Defaults to <dependent_variable>_prediction.',
            }
          )}
        >
          <EuiFieldText
            disabled={isJobCreated}
            value={predictionFieldName}
            onChange={(e) => setFormState({ predictionFieldName: e.target.value })}
            data-test-subj="mlAnalyticsCreateJobWizardPredictionFieldNameInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedLabel', {
            defaultMessage: 'Randomize seed',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedText', {
            defaultMessage: 'The seed for the random generator used to pick training data.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.RANDOMIZE_SEED] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.RANDOMIZE_SEED]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.randomizeSeedInputAriaLabel',
              {
                defaultMessage: 'The seed for the random generator used to pick training data.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardRandomizeSeedInput"
            onChange={(e) =>
              setFormState({ randomizeSeed: e.target.value === '' ? undefined : +e.target.value })
            }
            isInvalid={randomizeSeed !== undefined && typeof randomizeSeed !== 'number'}
            value={getNumberValue(randomizeSeed)}
            step={1}
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
      <EuiFlexGrid columns={3}>
        {jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && outlierDetectionAdvancedConfig}
        {isRegOrClassJob && regAndClassAdvancedConfig}
        {jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.analytics.create.numTopClassesLabel', {
                defaultMessage: 'Top classes',
              })}
              helpText={getTopClassesHelpText(selectedNumTopClasses)}
              isInvalid={selectedNumTopClasses === 0 || selectedNumTopClassesIsInvalid}
              error={[
                ...(selectedNumTopClasses === 0 ? [getZeroClassesMessage(classAucRocDocLink)] : []),
                ...(selectedNumTopClassesIsInvalid ? [numClassesTypeMessage] : []),
              ]}
            >
              <EuiComboBox
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.numTopClassesInputAriaLabel',
                  {
                    defaultMessage:
                      'The number of categories for which the predicted probabilities are reported',
                  }
                )}
                singleSelection={true}
                options={numTopClassesOptions}
                selectedOptions={numTopClassesSelectedOptions}
                onCreateOption={(input: string, flattenedOptions = []) => {
                  const normalizedInput = input.trim().toLowerCase();

                  if (normalizedInput === '') {
                    return;
                  }

                  const newOption = {
                    label: input,
                  };

                  if (
                    flattenedOptions.findIndex(
                      (option) => option.label.trim().toLowerCase() === normalizedInput
                    ) === -1
                  ) {
                    setNumTopClassesOptions([...numTopClassesOptions, newOption]);
                  }

                  setNumTopClassesSelectedOptions([newOption]);
                }}
                onChange={(selectedOptions) => {
                  setNumTopClassesSelectedOptions(selectedOptions);
                }}
                isClearable={true}
                isInvalid={selectedNumTopClasses !== undefined && selectedNumTopClasses < -1}
                data-test-subj="mlAnalyticsCreateJobWizardnumTopClassesInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryLimitLabel', {
              defaultMessage: 'Model memory limit',
            })}
            isInvalid={modelMemoryLimitValidationResult !== null}
            error={mmlErrors}
            helpText={i18n.translate(
              'xpack.ml.dataframe.analytics.create.modelMemoryLimitHelpText',
              {
                defaultMessage:
                  'The approximate maximum amount of memory resources that are permitted for analytical processing.',
              }
            )}
          >
            <>
              <EuiFieldText
                placeholder={
                  jobType !== undefined
                    ? DEFAULT_MODEL_MEMORY_LIMIT[jobType]
                    : DEFAULT_MODEL_MEMORY_LIMIT.outlier_detection
                }
                disabled={isJobCreated || useEstimatedMml}
                value={useEstimatedMml ? estimatedModelMemoryLimit : modelMemoryLimit || ''}
                onChange={(e) => setFormState({ modelMemoryLimit: e.target.value })}
                isInvalid={modelMemoryLimitValidationResult !== null}
                data-test-subj="mlAnalyticsCreateJobWizardModelMemoryInput"
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                disabled={isJobCreated}
                name="mlDataFrameAnalyticsUseEstimatedMml"
                label={i18n.translate('xpack.ml.dataframe.analytics.create.useEstimatedMmlLabel', {
                  defaultMessage: 'Use estimated model memory limit',
                })}
                checked={useEstimatedMml === true}
                onChange={() =>
                  setFormState({
                    useEstimatedMml: !useEstimatedMml,
                  })
                }
                data-test-subj="mlAnalyticsCreateJobWizardUseEstimatedMml"
              />
            </>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.analytics.create.maxNumThreadsLabel', {
              defaultMessage: 'Maximum number of threads',
            })}
            helpText={i18n.translate('xpack.ml.dataframe.analytics.create.maxNumThreadsHelpText', {
              defaultMessage:
                'The maximum number of threads to be used by the analysis. The default value is 1.',
            })}
            isInvalid={maxNumThreads === 0}
            error={
              maxNumThreads === 0 &&
              i18n.translate('xpack.ml.dataframe.analytics.create.maxNumThreadsError', {
                defaultMessage: 'The minimum value is 1.',
              })
            }
          >
            <EuiFieldNumber
              aria-label={i18n.translate(
                'xpack.ml.dataframe.analytics.create.maxNumThreadsInputAriaLabel',
                {
                  defaultMessage: 'The maximum number of threads to be used by the analysis.',
                }
              )}
              data-test-subj="mlAnalyticsCreateJobWizardMaxNumThreadsInput"
              min={1}
              onChange={(e) =>
                setFormState({
                  maxNumThreads: e.target.value === '' ? undefined : +e.target.value,
                })
              }
              step={1}
              value={getNumberValue(maxNumThreads)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer />
      <EuiAccordion
        id="hyper-parameters"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ml.dataframe.analytics.create.hyperParametersSectionTitle', {
                defaultMessage: 'Hyperparameters',
              })}
            </h3>
          </EuiTitle>
        }
        initialIsOpen={false}
        data-test-subj="mlAnalyticsCreateJobWizardHyperParametersSection"
      >
        <EuiFlexGrid columns={3}>
          {jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
            <OutlierHyperParameters
              actions={actions}
              state={state}
              advancedParamErrors={advancedParamErrors}
            />
          )}
          {isRegOrClassJob && (
            <HyperParameters
              actions={actions}
              state={state}
              advancedParamErrors={advancedParamErrors}
            />
          )}
        </EuiFlexGrid>
      </EuiAccordion>
      <EuiSpacer />
      <ContinueButton
        isDisabled={isStepInvalid}
        onClick={() => {
          setFormState({
            numTopClasses:
              selectedNumTopClassesIsInvalid === false ? selectedNumTopClasses : undefined,
          });
          setCurrentStep(ANALYTICS_STEPS.DETAILS);
        }}
      />
    </Fragment>
  );
};
