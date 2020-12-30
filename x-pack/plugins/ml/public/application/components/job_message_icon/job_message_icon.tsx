/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { AuditMessageBase } from '../../../../common/types/audit_message';

interface Props {
  message: AuditMessageBase;
  showTooltip?: boolean;
}

const [INFO, WARNING, ERROR] = ['info', 'warning', 'error'];

export const JobIcon: FC<Props> = ({ message, showTooltip = false }) => {
  if (message === undefined) {
    return <span />;
  }

  let color = 'primary';
  let icon = 'alert';

  if (message.level === INFO) {
    icon = 'iInCircle';
  } else if (message.level === WARNING) {
    color = 'warning';
  } else if (message.level === ERROR) {
    color = 'danger';
  }

  if (showTooltip) {
    return (
      <EuiToolTip position="bottom" content={message.text}>
        <EuiIcon type={icon} color={color} />
      </EuiToolTip>
    );
  } else {
    return <EuiIcon type={icon} color={color} />;
  }
};
