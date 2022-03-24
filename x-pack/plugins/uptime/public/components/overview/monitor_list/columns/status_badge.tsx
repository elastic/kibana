/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { STATUS } from '../../../../../common/constants';
import { getHealthMessage } from './monitor_status_column';
import { UptimeThemeContext } from '../../../../contexts';
import { PingError } from '../../../../../common/runtime_types';
import { getInlineErrorLabel } from '../../../monitor_management/monitor_list/inline_error';
import { StdErrorPopover } from '../../../monitor_management/monitor_list/stderr_logs_popover';

export const StatusBadge = ({
  status,
  checkGroup,
  summaryError,
  monitorType,
}: {
  status: string;
  monitorType: string;
  checkGroup?: string;
  summaryError?: PingError;
}) => {
  const {
    colors: { dangerBehindText },
  } = useContext(UptimeThemeContext);
  const [isOpen, setIsOpen] = useState(false);

  if (status === STATUS.UP) {
    return (
      <EuiBadge className="eui-textCenter" color={'success'}>
        {getHealthMessage(status)}
      </EuiBadge>
    );
  }

  const errorMessage =
    monitorType !== 'browser' ? summaryError?.message : getInlineErrorLabel(summaryError?.message);

  const button = (
    <EuiToolTip content={errorMessage}>
      <EuiBadge
        className="eui-textCenter"
        color={dangerBehindText}
        onClick={() => setIsOpen(true)}
        onClickAriaLabel={errorMessage}
      >
        {getHealthMessage(status)}
      </EuiBadge>
    </EuiToolTip>
  );

  if (monitorType !== 'browser') {
    return button;
  }

  return (
    <StdErrorPopover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      checkGroup={checkGroup!}
      button={button}
      summaryMessage={summaryError?.message}
    />
  );
};
