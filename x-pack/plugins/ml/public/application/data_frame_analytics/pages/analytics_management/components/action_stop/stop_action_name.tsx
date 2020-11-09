/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

export const stopActionNameText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.stopActionNameText',
  {
    defaultMessage: 'Stop',
  }
);

interface StopActionNameProps {
  isDisabled: boolean;
}

export const StopActionName: FC<StopActionNameProps> = ({ isDisabled }) => {
  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canStartStopDataFrameAnalytics')}
      >
        <>{stopActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{stopActionNameText}</>;
};
