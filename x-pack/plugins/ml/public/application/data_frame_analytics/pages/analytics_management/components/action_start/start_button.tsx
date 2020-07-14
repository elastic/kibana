/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../capabilities/check_capabilities';

import { DataFrameAnalyticsListRow, isCompletedAnalyticsJob } from '../analytics_list/common';

interface StartButtonProps {
  item: DataFrameAnalyticsListRow;
  onClick: (item: DataFrameAnalyticsListRow) => void;
}

export const StartButton: FC<StartButtonProps> = ({ item, onClick }) => {
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  const buttonStartText = i18n.translate('xpack.ml.dataframe.analyticsList.startActionName', {
    defaultMessage: 'Start',
  });

  // Disable start for analytics jobs which have completed.
  const completeAnalytics = isCompletedAnalyticsJob(item.stats);

  const disabled = !canStartStopDataFrameAnalytics || completeAnalytics;

  let startButton = (
    <EuiLink
      color={disabled ? 'subdued' : 'text'}
      onClick={disabled ? undefined : () => onClick(item)}
      aria-label={buttonStartText}
      data-test-subj="mlAnalyticsJobStartButton"
    >
      <EuiIcon type="play" /> {buttonStartText}
    </EuiLink>
  );

  if (!canStartStopDataFrameAnalytics || completeAnalytics) {
    startButton = (
      <EuiToolTip
        position="top"
        content={
          !canStartStopDataFrameAnalytics
            ? createPermissionFailureMessage('canStartStopDataFrameAnalytics')
            : i18n.translate('xpack.ml.dataframe.analyticsList.completeBatchAnalyticsToolTip', {
                defaultMessage:
                  '{analyticsId} is a completed analytics job and cannot be restarted.',
                values: { analyticsId: item.config.id },
              })
        }
      >
        {startButton}
      </EuiToolTip>
    );
  }

  return startButton;
};
