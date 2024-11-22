/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { HAS_DATA_FETCH_INTERVAL } from './utils';

export function AutoRefreshCallout() {
  const { euiTheme } = useEuiTheme();
  const messageId = useGeneratedHtmlId();

  return (
    <EuiFlexGroup>
      <EuiFlexItem
        role="status"
        aria-labelledby={messageId}
        grow={false}
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
          padding: ${euiTheme.size.m} ${euiTheme.size.base};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiIcon type="timeRefresh" size="m" />
          <EuiText size="s">
            <p id={messageId}>
              {i18n.translate(
                'xpack.observability_onboarding.firehosePanel.autorefreshCalloutLabel',
                {
                  defaultMessage: 'Auto-refreshing every {intervalSeconds} s',
                  values: { intervalSeconds: Math.round(HAS_DATA_FETCH_INTERVAL / 1000) },
                }
              )}
            </p>
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
