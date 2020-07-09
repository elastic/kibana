/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiStat, EuiIconTip, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { REGRESSION_STATS } from '../../../../common/analytics';

interface Props {
  isLoading: boolean;
  title: number | string;
  statType: REGRESSION_STATS;
  dataTestSubj: string;
}

const statDescriptions = {
  [REGRESSION_STATS.MSE]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.meanSquaredErrorText',
    {
      defaultMessage: 'Mean squared error',
    }
  ),
  [REGRESSION_STATS.MSLE]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.msleText',
    {
      defaultMessage: 'Mean squared logarithmic error',
    }
  ),
  [REGRESSION_STATS.R_SQUARED]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.rSquaredText',
    {
      defaultMessage: 'R squared',
    }
  ),
  [REGRESSION_STATS.HUBER]: (
    <FormattedMessage
      id="xpack.ml.dataframe.analytics.regressionExploration.huberText"
      defaultMessage="{wikiLink}"
      values={{
        wikiLink: (
          <EuiLink
            href="https://en.wikipedia.org/wiki/Huber_loss#Pseudo-Huber_loss_function"
            target="_blank"
            external
          >
            {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.huberLinkText', {
              defaultMessage: 'Pseudo Huber loss function',
            })}
          </EuiLink>
        ),
      }}
    />
  ),
};

const tooltipContent = {
  [REGRESSION_STATS.MSE]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.meanSquaredErrorTooltipContent',
    {
      defaultMessage:
        'Measures how well the regression analysis model is performing. Mean squared sum of the difference between true and predicted values.',
    }
  ),
  [REGRESSION_STATS.MSLE]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.msleTooltipContent',
    {
      defaultMessage:
        'Average squared difference between the logarithm of the predicted values and the logarithm of the actual (ground truth) value',
    }
  ),
  [REGRESSION_STATS.R_SQUARED]: i18n.translate(
    'xpack.ml.dataframe.analytics.regressionExploration.rSquaredTooltipContent',
    {
      defaultMessage:
        'Represents the goodness of fit. Measures how well the observed outcomes are replicated by the model.',
    }
  ),
};

export const EvaluateStat: FC<Props> = ({ isLoading, statType, title, dataTestSubj }) => (
  <EuiFlexGroup gutterSize="xs" data-test-subj={dataTestSubj}>
    <EuiFlexItem grow={false}>
      <EuiStat
        reverse
        isLoading={isLoading}
        title={title}
        description={statDescriptions[statType]}
        titleSize="xxs"
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {statType !== REGRESSION_STATS.HUBER && (
        <EuiIconTip
          anchorClassName="mlDataFrameAnalyticsRegression__evaluateStat"
          content={tooltipContent[statType]}
        />
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
