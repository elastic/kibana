/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import {
  State,
  UNSET_CONFIG_ITEM,
} from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common/analytics';
import { useMlContext } from '../../../../../contexts/ml';
import { ANALYTICS_STEPS } from '../../page';

const MAX_INCLUDES_LENGTH = 5;

interface Props {
  setCurrentStep: React.Dispatch<React.SetStateAction<any>>;
  state: State;
}

export const ConfigurationStepDetails: FC<Props> = ({ setCurrentStep, state }) => {
  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;
  const { form, isJobCreated } = state;
  const { dependentVariable, includes, jobConfigQueryString, jobType, trainingPercent } = form;

  const isJobTypeWithDepVar =
    jobType === ANALYSIS_CONFIG_TYPE.REGRESSION || jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;

  const detailsFirstCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.sourceIndex', {
        defaultMessage: 'Source index',
      }),
      description: currentIndexPattern.title || UNSET_CONFIG_ITEM,
    },
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.Query', {
        defaultMessage: 'Query',
      }),
      description: jobConfigQueryString || UNSET_CONFIG_ITEM,
    },
  ];

  const detailsSecondCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobType', {
        defaultMessage: 'Job type',
      }),
      description: jobType! as string,
    },
  ];

  const detailsThirdCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.includedFields', {
        defaultMessage: 'Included fields',
      }),
      description:
        includes.length > MAX_INCLUDES_LENGTH
          ? `${includes.slice(0, MAX_INCLUDES_LENGTH).join(', ')} ... (and ${
              includes.length - MAX_INCLUDES_LENGTH
            } more)`
          : includes.join(', '),
    },
  ];

  if (isJobTypeWithDepVar) {
    detailsSecondCol.push({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.trainingPercent', {
        defaultMessage: 'Training percent',
      }),
      description: `${trainingPercent}`,
    });
    detailsThirdCol.unshift({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.dependentVariable', {
        defaultMessage: 'Dependent variable',
      }),
      description: dependentVariable,
    });
  }

  return (
    <Fragment>
      <EuiFlexGroup style={{ width: '70%' }} justifyContent="spaceBetween">
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
      {!isJobCreated && (
        <EuiButtonEmpty
          iconType="pencil"
          size="s"
          onClick={() => {
            setCurrentStep(ANALYTICS_STEPS.CONFIGURATION);
          }}
        >
          {i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.editButtonText', {
            defaultMessage: 'Edit',
          })}
        </EuiButtonEmpty>
      )}
    </Fragment>
  );
};
