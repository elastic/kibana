/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import type { ToastInput } from 'src/core/public';

import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import type { SessionState } from './session_timeout';
import { GRACE_PERIOD_MS } from './session_timeout';

export interface SessionExpirationTitleProps {
  sessionState$: Observable<SessionState>;
}

export const SessionExpirationTitle: FunctionComponent<SessionExpirationTitleProps> = ({
  sessionState$,
}) => {
  const state = useObservable(sessionState$);

  if (!state) {
    return null;
  }

  return (
    <FormattedMessage
      id="xpack.security.sessionExpirationToast.title"
      defaultMessage="Session ends {timeout}"
      values={{
        timeout: (
          <FormattedRelative
            value={Math.max(state.expiresInMs - GRACE_PERIOD_MS, 0) + Date.now()}
            updateInterval={1000}
          />
        ),
      }}
    />
  );
};

export interface SessionExpirationBodyProps {
  sessionState$: Observable<SessionState>;
  onExtend: () => Promise<any>;
}

export const SessionExpirationBody: FunctionComponent<SessionExpirationBodyProps> = ({
  sessionState$,
  onExtend,
}) => {
  const state = useObservable(sessionState$);
  const [{ loading }, extend] = useAsyncFn(onExtend);

  if (!state) {
    return null;
  }

  if (state.canBeExtendedByMs > 0) {
    return (
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
    );
  }

  return (
    <FormattedMessage
      id="xpack.security.components.sessionExpirationToast.endOfLifeWarning"
      defaultMessage="You will need to log in again."
    />
  );
};

export const createSessionExpirationToast = (
  sessionState$: Observable<SessionState>,
  onExtend: () => Promise<any>,
  onClose?: () => void
): ToastInput => {
  return {
    color: 'warning',
    iconType: 'clock',
    title: toMountPoint(<SessionExpirationTitle sessionState$={sessionState$} />),
    text: toMountPoint(<SessionExpirationBody sessionState$={sessionState$} onExtend={onExtend} />),
    onClose,
    toastLifeTimeMs: 0x7fffffff, // Toast is hidden based on observable so using maximum possible timeout
  };
};
