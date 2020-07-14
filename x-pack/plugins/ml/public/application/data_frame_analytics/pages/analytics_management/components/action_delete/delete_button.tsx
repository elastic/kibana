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
import { isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from '../analytics_list/common';

interface DeleteButtonProps {
  item: DataFrameAnalyticsListRow;
  onClick: (item: DataFrameAnalyticsListRow) => void;
}

export const DeleteButton: FC<DeleteButtonProps> = ({ item, onClick }) => {
  const disabled = isDataFrameAnalyticsRunning(item.stats.state);
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');

  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.deleteActionName', {
    defaultMessage: 'Delete',
  });

  const buttonDisabled = disabled || !canDeleteDataFrameAnalytics;

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobDeleteButton"
      flush="left"
      iconType="trash"
      isDisabled={buttonDisabled}
      onClick={() => onClick(item)}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (buttonDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={
          disabled
            ? i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteActionDisabledToolTipContent',
                {
                  defaultMessage: 'Stop the data frame analytics job in order to delete it.',
                }
              )
            : createPermissionFailureMessage('canStartStopDataFrameAnalytics')
        }
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
