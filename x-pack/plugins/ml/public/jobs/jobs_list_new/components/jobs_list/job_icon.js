/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

export function JobIcon({ message }) {
  if (message !== undefined) {
    let color = '';
    const icon = 'alert';

    if (message.level === 1) {
      color = 'warning';
    } else if (message.level === 2) {
      color = 'danger';
    }

    return (
      <EuiToolTip
        position="bottom"
        content={message.text}
      >
        <EuiIcon
          type={icon}
          color={color}
        />
      </EuiToolTip>
    );
  } else {
    return (<span />);
  }
}
