/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React, { useContext } from 'react';
import { STATUS } from '../../../../../../common/constants';
import { getHealthMessage } from './monitor_status_column';
import { UptimeThemeContext } from '../../../../contexts';
import { PingError } from '../../../../../../common/runtime_types';

export const StatusBadge = ({
  status,
  summaryError,
}: {
  status: string;
  summaryError?: PingError;
}) => {
  const {
    colors: { dangerBehindText },
  } = useContext(UptimeThemeContext);

  if (status === STATUS.UP) {
    return (
      <EuiBadge className="eui-textCenter" color={'success'}>
        {getHealthMessage(status)}
      </EuiBadge>
    );
  }

  const errorMessage = summaryError?.message;

  return (
    <EuiToolTip content={errorMessage}>
      <EuiBadge className="eui-textCenter" color={dangerBehindText}>
        {getHealthMessage(status)}
      </EuiBadge>
    </EuiToolTip>
  );
};
