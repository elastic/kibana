/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../capabilities/check_capabilities';

import { stopAnalytics } from '../../services/analytics_service';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

const buttonStopText = i18n.translate('xpack.ml.dataframe.analyticsList.stopActionName', {
  defaultMessage: 'Stop',
});

interface StopButtonProps {
  item: DataFrameAnalyticsListRow;
}

export const StopButton: FC<StopButtonProps> = ({ item }) => {
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  const stopButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canStartStopDataFrameAnalytics}
      iconType="stop"
      onClick={() => stopAnalytics(item)}
      aria-label={buttonStopText}
      data-test-subj="mlAnalyticsJobStopButton"
    >
      {buttonStopText}
    </EuiButtonEmpty>
  );
  if (!canStartStopDataFrameAnalytics) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canStartStopDataFrameAnalytics')}
      >
        {stopButton}
      </EuiToolTip>
    );
  }

  return stopButton;
};
