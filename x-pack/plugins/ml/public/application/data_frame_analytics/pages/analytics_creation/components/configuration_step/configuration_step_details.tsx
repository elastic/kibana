/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { useMlContext } from '../../../../../contexts/ml';
import { ANALYTICS_STEPS } from '../../page';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const ConfigurationStepDetails: FC<{ setCurrentStep: any; state: State }> = ({
  setCurrentStep,
  state,
}) => {
  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;
  const { form } = state;
  const { dependentVariable, excludes, jobConfigQueryString, jobType, trainingPercent } = form;

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const detailsFirstCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobType', {
        defaultMessage: 'Source index',
      }),
      description: currentIndexPattern.title || '',
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.Query', {
        defaultMessage: 'Query',
      }),
      description: jobConfigQueryString || '',
    },
  ];

  const detailsSecondCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobType', {
        defaultMessage: 'Job type',
      }),
      description: jobType || '',
    },
  ];

  if (isJobTypeWithDepVar) {
    detailsFirstCol.push({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.trainingPercent', {
        defaultMessage: 'Training percent',
      }),
      description: `${trainingPercent}`,
    });
    detailsSecondCol.push({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.dependentVariable', {
        defaultMessage: 'Dependent variable',
      }),
      description: dependentVariable,
    });
  }

  const detailsThirdCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.excludedFields', {
        defaultMessage: 'Excluded fields',
      }),
      description: excludes.join(', '),
    },
  ];

  return (
    <Fragment>
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
      <EuiSpacer />
      <EuiButton
        iconType="pencil"
        size="s"
        onClick={() => {
          setCurrentStep(ANALYTICS_STEPS.CONFIGURATION);
        }}
      >
        {i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.editButtonText', {
          defaultMessage: 'Edit',
        })}
      </EuiButton>
    </Fragment>
  );
};
