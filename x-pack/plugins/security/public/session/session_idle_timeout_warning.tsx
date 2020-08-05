/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToastInput } from 'src/core/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiProgress } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface Props {
  onRefreshSession: () => void;
  timeout: number;
}

export const SessionIdleTimeoutWarning = (props: Props) => {
  return (
    <>
      <EuiProgress size="xs" color="danger" position="absolute" />
      <p>
        <FormattedMessage
          id="xpack.security.components.sessionIdleTimeoutWarning.message"
          defaultMessage="You will be logged out {timeout} due to inactivity. Click OK to resume."
          values={{
            timeout: (
              <FormattedRelative value={props.timeout} units="second" updateInterval={1000} />
            ),
          }}
        />
      </p>
      <div className="eui-textRight">
        <EuiButton
          size="s"
          color="warning"
          onClick={props.onRefreshSession}
          data-test-subj="refreshSessionButton"
        >
          <FormattedMessage
            id="xpack.security.components.sessionIdleTimeoutWarning.okButtonText"
            defaultMessage="OK"
          />
        </EuiButton>
      </div>
    </>
  );
};

export const createToast = (toastLifeTimeMs: number, onRefreshSession: () => void): ToastInput => {
  const timeout = toastLifeTimeMs + Date.now();
  return {
    color: 'warning',
    text: toMountPoint(
      <SessionIdleTimeoutWarning onRefreshSession={onRefreshSession} timeout={timeout} />
    ),
    title: i18n.translate('xpack.security.components.sessionIdleTimeoutWarning.title', {
      defaultMessage: 'Warning',
    }),
    iconType: 'clock',
    toastLifeTimeMs,
  };
};
