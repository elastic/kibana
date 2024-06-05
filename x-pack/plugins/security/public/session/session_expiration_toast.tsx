/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import type { ToastInput } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelativeTime } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { SessionState } from './session_timeout';
import type { StartServices } from '..';
import { SESSION_GRACE_PERIOD_MS } from '../../common/constants';

export interface SessionExpirationToastProps {
  sessionState$: Observable<SessionState>;
  onExtend: () => Promise<any>;
}

export const SessionExpirationToast: FunctionComponent<SessionExpirationToastProps> = ({
  sessionState$,
  onExtend,
}) => {
  const state = useObservable(sessionState$);
  const [{ loading }, extend] = useAsyncFn(onExtend);

  if (!state || !state.expiresInMs) {
    return null;
  }

  const timeoutSeconds = Math.max(state.expiresInMs - SESSION_GRACE_PERIOD_MS, 0) / 1000;

  const expirationWarning = (
    <FormattedMessage
      id="xpack.security.sessionExpirationToast.body"
      defaultMessage="You will be logged out {timeout}."
      values={{
        timeout: <FormattedRelativeTime value={timeoutSeconds} />,
      }}
    />
  );

  if (state.canBeExtended) {
    return (
      <>
        {expirationWarning}
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" color="warning" isLoading={loading} onClick={extend}>
              <FormattedMessage
                id="xpack.security.sessionExpirationToast.extendButton"
                defaultMessage="Stay logged in"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return expirationWarning;
};

export const createSessionExpirationToast = (
  services: StartServices,
  sessionState$: Observable<SessionState>,
  onExtend: () => Promise<any>,
  onClose: () => void
): ToastInput => {
  return {
    color: 'warning',
    iconType: 'clock',
    title: i18n.translate('xpack.security.sessionExpirationToast.title', {
      defaultMessage: 'Session timeout',
    }),
    text: toMountPoint(
      <SessionExpirationToast sessionState$={sessionState$} onExtend={onExtend} />,
      services
    ),
    onClose,
    toastLifeTimeMs: 0x7fffffff, // Toast is hidden based on observable so using maximum possible timeout
  };
};
