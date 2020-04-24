/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const AdvancedStepDetails: FC<{ state: State }> = ({ state }) => {
  const { form } = state;
  const {
    lambda,
    maxTrees,
    modelMemoryLimit,
    numTopClasses,
    numTopFeatureImportanceValues,
    predictionFieldName,
  } = form;

  const detailsFirstCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.numTopClasses', {
        defaultMessage: 'Top classes',
      }),
      description: `${numTopClasses}` || '',
    },
    {
      title: i18n.translate(
        'xpack.ml.dataframe.analytics.create.configDetails.numTopFeatureImportanceValues',
        {
          defaultMessage: 'Top feature importance values',
        }
      ),
      description: `${numTopFeatureImportanceValues}`,
    },
  ];

  const detailsSecondCol = [
    {
      title: i18n.translate(
        'xpack.ml.dataframe.analytics.create.configDetails.predictionFieldName',
        {
          defaultMessage: 'Prediction field name',
        }
      ),
      description: predictionFieldName,
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.modelMemoryLimit', {
        defaultMessage: 'Model memory limit',
      }),
      description: `${modelMemoryLimit || ''}`,
    },
  ];

  const detailsThirdCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.lambdaFields', {
        defaultMessage: 'Lambda',
      }),
      description: `${lambda || ''}`,
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.maxTreesFields', {
        defaultMessage: 'Max trees',
      }),
      description: `${maxTrees || ''}`,
    },
  ];

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={detailsFirstCol} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={detailsSecondCol} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={detailsThirdCol} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
