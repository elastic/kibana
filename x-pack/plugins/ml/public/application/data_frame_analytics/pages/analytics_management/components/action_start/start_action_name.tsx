/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

export const startActionNameText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.startActionNameText',
  {
    defaultMessage: 'Start',
  }
);

interface StartActionNameProps {
  canStartStopDataFrameAnalytics: boolean;
  isDisabled: boolean;
  item: DataFrameAnalyticsListRow;
}

export const StartActionName: FC<StartActionNameProps> = ({
  canStartStopDataFrameAnalytics,
  isDisabled,
  item,
}) => {
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
        <>{startActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{startActionNameText}</>;
};
