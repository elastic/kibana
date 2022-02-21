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

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { ToastInput } from 'src/core/public';

import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { SESSION_GRACE_PERIOD_MS } from '../../common/constants';
import type { SessionState } from './session_timeout';

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

  const expirationWarning = (
    <FormattedMessage
      id="xpack.security.sessionExpirationToast.body"
      defaultMessage="You will be logged out {timeout}."
      values={{
        timeout: (
          <FormattedRelative
            value={Math.max(state.expiresInMs - SESSION_GRACE_PERIOD_MS, 0) + Date.now()}
            updateInterval={1000}
          />
        ),
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
      <SessionExpirationToast sessionState$={sessionState$} onExtend={onExtend} />
    ),
    onClose,
    toastLifeTimeMs: 0x7fffffff, // Toast is hidden based on observable so using maximum possible timeout
  };
};
