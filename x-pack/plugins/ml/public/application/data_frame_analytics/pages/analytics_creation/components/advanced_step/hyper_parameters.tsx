/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  const { eta, featureBagFraction, gamma, lambda, maxTrees, randomizeSeed } = state.form;

  return (
    <Fragment>
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaLabel', {
            defaultMessage: 'Lambda',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaHelpText', {
            defaultMessage:
              'Regularization parameter to prevent overfitting on the training data set. Must be a non negative value.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.LAMBDA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.LAMBDA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.lambdaInputAriaLabel', {
              defaultMessage:
                'Regularization parameter to prevent overfitting on the training data set.',
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
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesLabel', {
            defaultMessage: 'Max trees',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.maxTreesText', {
            defaultMessage: 'The maximum number of trees the forest is allowed to contain.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.MAX_TREES] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.MAX_TREES]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analytics.create.maxTreesInputAriaLabel',
              {
                defaultMessage: 'The maximum number of trees the forest is allowed to contain.',
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
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaLabel', {
            defaultMessage: 'Gamma',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.gammaText', {
            defaultMessage:
              'Multiplies a linear penalty associated with the size of individual trees in the forest. Must be non-negative value.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.GAMMA] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.GAMMA]}
        >
          <EuiFieldNumber
            aria-label={i18n.translate('xpack.ml.dataframe.analytics.create.gammaInputAriaLabel', {
              defaultMessage:
                'Multiplies a linear penalty associated with the size of individual trees in the forest',
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
      <EuiFlexItem style={{ minWidth: '30%' }}>
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
              defaultMessage: 'The shrinkage applied to the weights',
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
      <EuiFlexItem style={{ minWidth: '30%' }}>
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
      <EuiFlexItem style={{ minWidth: '30%' }}>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedLabel', {
            defaultMessage: 'Randomize seed',
          })}
          helpText={i18n.translate('xpack.ml.dataframe.analytics.create.randomizeSeedText', {
            defaultMessage:
              'The seed to the random generator that is used to pick which documents will be used for training.',
          })}
          isInvalid={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.RANDOMIZE_SEED] !== undefined}
          error={advancedParamErrors[ANALYSIS_ADVANCED_FIELDS.RANDOMIZE_SEED]}
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
};
