/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

export const stopActionButtonText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.stopActionName',
  {
    defaultMessage: 'Stop',
  }
);

interface StopButtonProps {
  isDisabled: boolean;
}

export const StopButton: FC<StopButtonProps> = ({ isDisabled }) => {
  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canStartStopDataFrameAnalytics')}
      >
        <>{stopActionButtonText}</>
      </EuiToolTip>
    );
  }

  return <>{stopActionButtonText}</>;
};
