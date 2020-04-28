/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const AdvancedStepDetails: FC<{ state: State }> = ({ state }) => {
  const { form } = state;
  const {
    computeFeatureInfluence,
    dependentVariable,
    eta,
    featureBagFraction,
    featureInfluenceThreshold,
    gamma,
    jobType,
    lambda,
    method,
    maxTrees,
    modelMemoryLimit,
    nNeighbors,
    numTopClasses,
    numTopFeatureImportanceValues,
    outlierFraction,
    predictionFieldName,
    randomizeSeed,
    standardizationEnabled,
  } = form;

  const detailsFirstCol: ListItems[] = [];

  const detailsSecondCol: ListItems[] = [];

  const detailsThirdCol: ListItems[] = [];

  if (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION) {
    detailsFirstCol.push({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.numTopClasses', {
        defaultMessage: 'Top classes',
      }),
      description: `${numTopClasses}` || '',
    });
  }

  if (
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
    jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION
  ) {
    detailsFirstCol.push(
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.numTopFeatureImportanceValues',
          {
            defaultMessage: 'Top feature importance values',
          }
        ),
        description: `${numTopFeatureImportanceValues}`,
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.lambdaFields', {
          defaultMessage: 'Lambda',
        }),
        description: `${lambda || ''}`,
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.eta', {
          defaultMessage: 'ETA',
        }),
        description: `${eta}` || '""',
      }
    );

    if (predictionFieldName !== '') {
      detailsSecondCol.push({
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.predictionFieldName',
          {
            defaultMessage: 'Prediction field name',
          }
        ),
        description: predictionFieldName,
      });
    } else if (dependentVariable !== '') {
      detailsSecondCol.push({
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.predictionFieldName',
          {
            defaultMessage: 'Prediction field name',
          }
        ),
        description: `${dependentVariable}_prediction`,
      });
    }

    detailsSecondCol.push(
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.maxTreesFields', {
          defaultMessage: 'Max trees',
        }),
        description: `${maxTrees || ''}`,
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.featureBagFraction',
          {
            defaultMessage: 'Feature bag fraction',
          }
        ),
        description: `${featureBagFraction}` || '""',
      }
    );

    detailsThirdCol.push(
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.modelMemoryLimit',
          {
            defaultMessage: 'Model memory limit',
          }
        ),
        description: `${modelMemoryLimit || '""'}`,
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.gamma', {
          defaultMessage: 'Gamma',
        }),
        description: `${gamma}` || '""',
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.randomizedSeed', {
          defaultMessage: 'Randomized seed',
        }),
        description: `${randomizeSeed}` || '""',
      }
    );
  }

  if (jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION) {
    detailsFirstCol.push(
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.featureInfluenceThreshold',
          {
            defaultMessage: 'Feature influence threshold',
          }
        ),
        description: `${featureInfluenceThreshold}`,
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.nNeighbors', {
          defaultMessage: 'N neighbors',
        }),
        description: nNeighbors ? `${nNeighbors}` : '""',
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.computeFeatureInfluence',
          {
            defaultMessage: 'Compute feature influence',
          }
        ),
        description: computeFeatureInfluence,
      }
    );

    detailsSecondCol.push(
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.modelMemoryLimit',
          {
            defaultMessage: 'Model memory limit',
          }
        ),
        description: `${modelMemoryLimit || '""'}`,
      },
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.outlierFraction', {
          defaultMessage: 'Outlier fraction',
        }),
        description: outlierFraction ? `${outlierFraction}` : '""',
      }
    );

    detailsThirdCol.push(
      {
        title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.nNeighbors', {
          defaultMessage: 'Method',
        }),
        description: method ? `${method}` : '""',
      },
      {
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.create.configDetails.standardizationEnabled',
          {
            defaultMessage: 'Standardization enabled',
          }
        ),
        description: standardizationEnabled ? `${standardizationEnabled}` : '""',
      }
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsFirstCol} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsSecondCol} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsThirdCol} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
