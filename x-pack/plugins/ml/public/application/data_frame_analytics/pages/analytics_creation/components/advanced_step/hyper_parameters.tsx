/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiFieldNumber, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { AdvancedParamErrors, getNumberValue } from './advanced_step_form';
import { ANALYSIS_ADVANCED_FIELDS } from '../../../../common/analytics';

const MAX_TREES_LIMIT = 2000;

interface Props extends CreateAnalyticsFormProps {
  advancedParamErrors: AdvancedParamErrors;
}

export const HyperParameters: FC<Props> = ({ actions, state, advancedParamErrors }) => {
  const { setFormState } = actions;

  const {
    alpha,
    downsampleFactor,
    eta,
    etaGrowthRatePerTree,
    featureBagFraction,
    gamma,
    lambda,
    maxOptimizationRoundsPerHyperparameter,
    maxTrees,
    softTreeDepthLimit,
    softTreeDepthTolerance,
  } = state.form;

  return (
    <Fragment>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaLabel', {
            defaultMessage: 'Lambda',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaHelpText', {
            defaultMessage:
              'A multiplier of the leaf weights in loss calculations. Must be a nonnegative value.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.LAMBDA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.LAMBDA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaInputAriaLabel', {
              defaultMessage: 'A multiplier of leaf weights in loss calculations.',
            })}
            data-test-subj="mlAnalyticsCreateJobFlyoutLambdaInput"
            onChange={(e) =>
              setFormState({ lambda: e.target.value === '' ? undefined : +e.target.value })
            }
            step={0.001}
            min={0}
            value={getNumberValue(lambda)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesLabel', {
            defaultMessage: 'Max trees',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesText', {
            defaultMessage: 'The maximum number of decision trees in the forest.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.MAX_TREES] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.MAX_TREES]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.maxTreesInputAriaLabel',
              {
                defaultMessage: 'The maximum number of decision trees in the forest.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobFlyoutMaxTreesInput"
            onChange={(e) =>
              setFormState({ maxTrees: e.target.value === '' ? undefined : +e.target.value })
            }
            isInvalid={maxTrees !== undefined && !Number.isInteger(maxTrees)}
            step={1}
            min={1}
            max={MAX_TREES_LIMIT}
            value={getNumberValue(maxTrees)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaLabel', {
            defaultMessage: 'Gamma',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.gammaText', {
            defaultMessage:
              'A multiplier of the tree size in loss calcuations. Must be nonnegative value.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.GAMMA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.GAMMA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaInputAriaLabel', {
              defaultMessage: 'A multiplier of the tree size in loss calculations.',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardGammaInput"
            onChange={(e) =>
              setFormState({ gamma: e.target.value === '' ? undefined : +e.target.value })
            }
            step={0.001}
            min={0}
            value={getNumberValue(gamma)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.etaLabel', {
            defaultMessage: 'Eta',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.etaText', {
            defaultMessage: 'The shrinkage applied to the weights. Must be between 0.001 and 1.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ETA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ETA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.etaInputAriaLabel', {
              defaultMessage: 'The shrinkage applied to the weights.',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardEtaInput"
            onChange={(e) =>
              setFormState({ eta: e.target.value === '' ? undefined : +e.target.value })
            }
            step={0.001}
            min={0.001}
            max={1}
            value={getNumberValue(eta)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.featureBagFractionLabel', {
            defaultMessage: 'Feature bag fraction',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.featureBagFractionText', {
            defaultMessage:
              'The fraction of features used when selecting a random bag for each candidate split.',
          })}
          isInvalid={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.FEATURE_BAG_FRACTION] !== undefined
          }
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.FEATURE_BAG_FRACTION]}
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
            onChange={(e) =>
              setFormState({
                featureBagFraction: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            isInvalid={
              featureBagFraction !== undefined &&
              (featureBagFraction > 1 || featureBagFraction <= 0)
            }
            step={0.001}
            max={1}
            value={getNumberValue(featureBagFraction)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.alphaLabel', {
            defaultMessage: 'Alpha',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.alphaText', {
            defaultMessage:
              'A multiplier of the tree depth in loss calculations. Must be greater than or equal to 0.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ALPHA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ALPHA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.alphaInputAriaLabel', {
              defaultMessage: 'A multiplier of the tree depth in loss calculations.',
            })}
            data-test-subj="mlAnalyticsCreateJobWizardAlphaInput"
            onChange={(e) =>
              setFormState({ alpha: e.target.value === '' ? undefined : +e.target.value })
            }
            step={0.001}
            min={0}
            value={getNumberValue(alpha)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.downsampleFactorLabel', {
            defaultMessage: 'Downsample factor',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.downsampleFactorText', {
            defaultMessage:
              'The fraction of data used to compute derivatives of the loss function for tree training. Must be between 0 and 1.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.DOWNSAMPLE_FACTOR] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.DOWNSAMPLE_FACTOR]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.downsampleFactorInputAriaLabel',
              {
                defaultMessage:
                  'The fraction of data used to compute derivatives of the loss function for tree training.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardDownsampleFactorInput"
            onChange={(e) =>
              setFormState({
                downsampleFactor: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            step={0.001}
            min={0}
            max={1}
            value={getNumberValue(downsampleFactor)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.etaGrowthRatePerTreeLabel', {
            defaultMessage: 'Eta growth rate per tree',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.etaGrowthRatePerTreeText', {
            defaultMessage:
              'The rate at which eta increases for each new tree that is added to the forest. Must be between 0.5 and 2.',
          })}
          isInvalid={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ETA_GROWTH_RATE_PER_TREE] !== undefined
          }
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.ETA_GROWTH_RATE_PER_TREE]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.etaGrowthRatePerTreeInputAriaLabel',
              {
                defaultMessage:
                  'The rate at which eta increases for each new tree that is added to the forest.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardEtaGrowthRatePerTreeInput"
            onChange={(e) =>
              setFormState({
                etaGrowthRatePerTree: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            step={0.001}
            min={0.5}
            max={2}
            value={getNumberValue(etaGrowthRatePerTree)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.maxOptimizationRoundsPerHyperparameterLabel',
            {
              defaultMessage: 'Max optimization rounds per hyperparameter',
            }
          )}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.maxOptimizationRoundsPerHyperparameterText',
            {
              defaultMessage:
                'The maximum number of optimization rounds for each undefined hyperparameter.',
            }
          )}
          isInvalid={
            advancedParamErrors[
              ANALYSIS_ADVANCED_FIELDS.MAX_OPTIMIZATION_ROUNDS_PER_HYPERPARAMETER
            ] !== undefined
          }
          error={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.MAX_OPTIMIZATION_ROUNDS_PER_HYPERPARAMETER]
          }
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.maxOptimizationRoundsPerHyperparameterInputAriaLabel',
              {
                defaultMessage:
                  'The maximum number of optimization rounds for each undefined hyperparameter. Must be an integer between 0 and 20.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardMaxOptimizationRoundsPerHyperparameterInput"
            onChange={(e) =>
              setFormState({
                maxOptimizationRoundsPerHyperparameter:
                  e.target.value === '' ? undefined : +e.target.value,
              })
            }
            min={0}
            max={20}
            step={1}
            value={getNumberValue(maxOptimizationRoundsPerHyperparameter)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.softTreeDepthLimitLabel', {
            defaultMessage: 'Soft tree depth limit',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.softTreeDepthLimitText', {
            defaultMessage:
              'Decision trees that exceed this depth are penalized in loss calculations. Must be greater than or equal to 0. ',
          })}
          isInvalid={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.SOFT_TREE_DEPTH_LIMIT] !== undefined
          }
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.SOFT_TREE_DEPTH_LIMIT]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.softTreeDepthLimitInputAriaLabel',
              {
                defaultMessage:
                  'Decision trees that exceed this depth are penalized in loss calculations.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardSoftTreeDepthLimitInput"
            onChange={(e) =>
              setFormState({
                softTreeDepthLimit: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            step={0.001}
            min={0}
            value={getNumberValue(softTreeDepthLimit)}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.softTreeDepthToleranceLabel', {
            defaultMessage: 'Soft tree depth tolerance',
          })}
          helpText={i18n.translate(
            'xpack.ml.dataframe.analytics.create.softTreeDepthToleranceText',
            {
              defaultMessage:
                'Controls how quickly the loss increases when tree depths exceed soft limits. The smaller the value, the faster the loss increases. Must be greater than or equal to 0.01. ',
            }
          )}
          isInvalid={
            advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.SOFT_TREE_DEPTH_TOLERANCE] !== undefined
          }
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.SOFT_TREE_DEPTH_TOLERANCE]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.softTreeDepthToleranceInputAriaLabel',
              {
                defaultMessage:
                  'Decision trees that exceed this depth are penalized in loss calculations.',
              }
            )}
            data-test-subj="mlAnalyticsCreateJobWizardSoftTreeDepthToleranceInput"
            onChange={(e) =>
              setFormState({
                softTreeDepthTolerance: e.target.value === '' ? undefined : +e.target.value,
              })
            }
            step={0.001}
            min={0.01}
            value={getNumberValue(softTreeDepthTolerance)}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </Fragment>
  );
};
