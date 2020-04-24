/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { useMlContext } from '../../../../../contexts/ml';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const ConfigurationStepDetails: FC<{ state: State }> = ({ state }) => {
  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;
  const { form } = state;
  const { dependentVariable, excludes, jobType, trainingPercent } = form;

  const detailsFirstCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobType', {
        defaultMessage: 'Source index',
      }),
      description: currentIndexPattern.title || '',
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.trainingPercent', {
        defaultMessage: 'Training percent',
      }),
      description: `${trainingPercent}`,
    },
  ];

  const detailsSecondCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobType', {
        defaultMessage: 'Job type',
      }),
      description: jobType || '',
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.dependentVariable', {
        defaultMessage: 'Dependent variable',
      }),
      description: dependentVariable,
    },
  ];

  const detailsThirdCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.excludedFields', {
        defaultMessage: 'Excluded fields',
      }),
      description: excludes.join(', '),
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
