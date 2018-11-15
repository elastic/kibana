/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import {
  EuiIcon
} from '@elastic/eui';

export function ConnectionStatus({ isConnected }) {
  if (isConnected) {
    return (
      <EuiIcon
        type="check"
        color="success"
        aria-label={i18n.translate('xpack.remoteClusters.connectedStatus.connectedAriaLabel', {
          defaultMessage: 'Connected',
        })}
      />
    );
  }

  return (
    <EuiIcon
      type="cross"
      color="danger"
      aria-label={i18n.translate('xpack.remoteClusters.connectedStatus.notConnectedAriaLabel', {
        defaultMessage: 'Not connected',
      })}
    />
  );
}

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool,
};
