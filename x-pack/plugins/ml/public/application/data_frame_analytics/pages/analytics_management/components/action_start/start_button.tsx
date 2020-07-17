/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.startActionName', {
  defaultMessage: 'Start',
});

interface StartButtonProps {
  canStartStopDataFrameAnalytics: boolean;
  isDisabled: boolean;
  item: DataFrameAnalyticsListRow;
  onClick: () => void;
}

export const StartButton: FC<StartButtonProps> = ({
  canStartStopDataFrameAnalytics,
  isDisabled,
  item,
  onClick,
}) => {
  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobStartButton"
      flush="left"
      iconType="play"
      isDisabled={isDisabled}
      onClick={onClick}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (isDisabled) {
    return (
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
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
