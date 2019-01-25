/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

export function ConnectionStatus({ isConnected }) {
  let icon;
  let message;

  if (isConnected) {
    icon = (
      <EuiIcon
        type="check"
        color="success"
      />
    );

    message = i18n.translate('xpack.remoteClusters.connectedStatus.connectedAriaLabel', {
      defaultMessage: 'Connected',
    });
  } else {
    icon = (
      <EuiIcon
        type="cross"
        color="danger"
      />
    );

    message = i18n.translate('xpack.remoteClusters.connectedStatus.notConnectedAriaLabel', {
      defaultMessage: 'Not connected',
    });
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        {icon}
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          {message}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool,
};
