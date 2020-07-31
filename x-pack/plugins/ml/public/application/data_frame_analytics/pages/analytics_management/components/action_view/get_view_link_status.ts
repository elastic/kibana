/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '../../../../common/analytics';
import {
  DataFrameAnalyticsListRow,
  isDataFrameAnalyticsStopped,
  isDataFrameAnalyticsFailed,
  getDataFrameAnalyticsProgressPhase,
} from '../analytics_list/common';

const unknownJobTypeMessage = i18n.translate(
  'xpack.ml.dataframe.analyticsList.viewActionUnknownJobTypeToolTipContent',
  {
    defaultMessage: 'There is no results page available for this type of data frame analytics job.',
  }
);
const jobNotStartedMessage = i18n.translate(
  'xpack.ml.dataframe.analyticsList.viewActionJobNotStartedToolTipContent',
  {
    defaultMessage:
      'The data frame analytics job did not start. There is no results page available.',
  }
);
const jobNotFinishedMessage = i18n.translate(
  'xpack.ml.dataframe.analyticsList.viewActionJobNotFinishedToolTipContent',
  {
    defaultMessage:
      'The data frame analytics job is not finished. There is no results page available.',
  }
);
const jobFailedMessage = i18n.translate(
  'xpack.ml.dataframe.analyticsList.viewActionJobFailedToolTipContent',
  {
    defaultMessage: 'The data frame analytics job failed. There is no results page available.',
  }
);

interface ViewLinkStatusReturn {
  disabled: boolean;
  tooltipContent?: string;
}

export function getViewLinkStatus(item: DataFrameAnalyticsListRow): ViewLinkStatusReturn {
  const viewLinkStatus: ViewLinkStatusReturn = { disabled: false };

  const progressStats = getDataFrameAnalyticsProgressPhase(item.stats);
  const jobFailed = isDataFrameAnalyticsFailed(item.stats.state);
  const jobNotStarted = progressStats.currentPhase === 1 && progressStats.progress === 0;
  const jobFinished =
    isDataFrameAnalyticsStopped(item.stats.state) &&
    progressStats.currentPhase === progressStats.totalPhases &&
    progressStats.progress === 100;
  const isUnknownJobType =
    !isRegressionAnalysis(item.config.analysis) &&
    !isOutlierAnalysis(item.config.analysis) &&
    !isClassificationAnalysis(item.config.analysis);

  const disabled = !jobFinished || jobFailed || isUnknownJobType;

  if (disabled) {
    viewLinkStatus.disabled = true;
    if (isUnknownJobType) {
      viewLinkStatus.tooltipContent = unknownJobTypeMessage;
    } else if (jobFailed) {
      viewLinkStatus.tooltipContent = jobFailedMessage;
    } else if (jobNotStarted) {
      viewLinkStatus.tooltipContent = jobNotStartedMessage;
    } else if (!jobFinished) {
      viewLinkStatus.tooltipContent = jobNotFinishedMessage;
    }
  }

  return viewLinkStatus;
}
