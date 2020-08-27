/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { ActionConnector } from '../../state/alerts/alerts';

export const simpleAlertEnabled = (defaultActions: ActionConnector[]) => {
  return {
    title: i18n.translate('xpack.uptime.overview.alerts.enabled.success', {
      defaultMessage: 'Alert successfully enabled ',
    }),
    text: toMountPoint(
      <FormattedMessage
        id="xpack.uptime.overview.alerts.enabled.success.description"
        defaultMessage="Message will be send to {actionConnectors} when monitor is down."
        values={{
          actionConnectors: <strong>{defaultActions.map(({ name }) => name).join(', ')}</strong>,
        }}
      />
    ),
  };
};
