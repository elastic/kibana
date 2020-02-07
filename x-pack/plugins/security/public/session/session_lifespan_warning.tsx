/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToastInput } from 'src/core/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { EuiProgress } from '@elastic/eui';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface Props {
  timeout: number;
}

export const SessionLifespanWarning = (props: Props) => {
  return (
    <>
      <EuiProgress size="xs" color="danger" position="absolute" />
      <p>
        <FormattedMessage
          id="xpack.security.components.sessionLifespanWarning.message"
          defaultMessage="Your session will reach the maximum time limit {timeout}. You will need to log in again."
          values={{
            timeout: (
              <FormattedRelative value={props.timeout} units="second" updateInterval={1000} />
            ),
          }}
        />
      </p>
    </>
  );
};

export const createToast = (toastLifeTimeMs: number): ToastInput => {
  const timeout = toastLifeTimeMs + Date.now();
  return {
    color: 'danger',
    text: toMountPoint(<SessionLifespanWarning timeout={timeout} />),
    title: i18n.translate('xpack.security.components.sessionLifespanWarning.title', {
      defaultMessage: 'Warning',
    }),
    iconType: 'alert',
    toastLifeTimeMs,
  };
};
