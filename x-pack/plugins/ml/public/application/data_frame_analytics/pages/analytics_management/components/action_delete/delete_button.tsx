/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';
import { isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from '../analytics_list/common';

const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.deleteActionName', {
  defaultMessage: 'Delete',
});

interface DeleteButtonProps {
  isDisabled: boolean;
  item: DataFrameAnalyticsListRow;
  onClick: () => void;
}

export const DeleteButton: FC<DeleteButtonProps> = ({ isDisabled, item, onClick }) => {
  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobDeleteButton"
      flush="left"
      iconType="trash"
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
          isDataFrameAnalyticsRunning(item.stats.state)
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
