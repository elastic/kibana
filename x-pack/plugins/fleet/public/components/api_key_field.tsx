/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { useStartServices } from '../hooks';

export const ApiKeyField: React.FunctionComponent<{
  apiKeyId: string;
  length: number;
  sendGetAPIKey: (id: string) => Promise<SendRequestResponse>;
  tokenGetter: (response: SendRequestResponse) => string | undefined;
}> = ({ apiKeyId, length, sendGetAPIKey, tokenGetter }) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useStartServices();
  const [state, setState] = useState<'VISIBLE' | 'HIDDEN' | 'LOADING'>('HIDDEN');
  const [key, setKey] = useState<string | undefined>();

  const tokenMask = useMemo(() => '•'.repeat(length), [length]);

  const toggleKey = async () => {
    if (state === 'VISIBLE') {
      setState('HIDDEN');
    } else if (state === 'HIDDEN') {
      try {
        setState('LOADING');
        const res = await sendGetAPIKey(apiKeyId);
        if (res.error) {
          throw res.error;
        }
        setKey(tokenGetter(res));
        setState('VISIBLE');
      } catch (err) {
        notifications.toasts.addError(err as Error, {
          title: 'Error',
        });
        setState('HIDDEN');
      }
    }
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText
          color="subdued"
          size="xs"
          css={css`
            font-family: ${euiTheme.font.familyCode};
          `}
          data-test-subj="apiKeyField"
        >
          {state === 'VISIBLE' ? key : tokenMask}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            state === 'VISIBLE'
              ? i18n.translate('xpack.fleet.enrollmentTokensList.hideTokenButtonLabel', {
                  defaultMessage: 'Hide token',
                })
              : i18n.translate('xpack.fleet.enrollmentTokensList.showTokenButtonLabel', {
                  defaultMessage: 'Show token',
                })
          }
        >
          <EuiButtonIcon
            aria-label={
              state === 'VISIBLE'
                ? i18n.translate('xpack.fleet.enrollmentTokensList.hideTokenButtonLabel', {
                    defaultMessage: 'Hide token',
                  })
                : i18n.translate('xpack.fleet.enrollmentTokensList.showTokenButtonLabel', {
                    defaultMessage: 'Show token',
                  })
            }
            color="text"
            onClick={toggleKey}
            iconType={state === 'VISIBLE' ? 'eyeClosed' : 'eye'}
            data-test-subj="showHideTokenButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
