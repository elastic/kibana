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
import { isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from '../analytics_list/common';

interface DeleteButtonProps {
  item: DataFrameAnalyticsListRow;
  onClick: (item: DataFrameAnalyticsListRow) => void;
}

export const DeleteButton: FC<DeleteButtonProps> = ({ item, onClick }) => {
  const disabled = isDataFrameAnalyticsRunning(item.stats.state);
  const canDeleteDataFrameAnalytics: boolean = checkPermission('canDeleteDataFrameAnalytics');

  const buttonDeleteText = i18n.translate('xpack.ml.dataframe.analyticsList.deleteActionName', {
    defaultMessage: 'Delete',
  });

  const buttonDisabled = disabled || !canDeleteDataFrameAnalytics;
  let deleteButton = (
    <EuiLink
      data-test-subj="mlAnalyticsJobDeleteButton"
      color={buttonDisabled ? 'subdued' : 'text'}
      disabled={buttonDisabled}
      onClick={buttonDisabled ? undefined : () => onClick(item)}
      aria-label={buttonDeleteText}
      style={{ padding: 0 }}
    >
      <EuiIcon type="trash" /> {buttonDeleteText}
    </EuiLink>
  );

  if (disabled || !canDeleteDataFrameAnalytics) {
    deleteButton = (
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
        {deleteButton}
      </EuiToolTip>
    );
  }

  return deleteButton;
};
