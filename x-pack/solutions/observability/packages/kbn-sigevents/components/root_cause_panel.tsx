/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { InfoPanel } from './info_panel';
import { RootCauseIllustration } from './root_cause_illustration';
import { DevModePlaceholder } from './dev_mode_placeholder';

const DEFAULT_ILLUSTRATION_SIZE = 48;

export interface RootCausePanelProps {
  title?: string;
  children?: React.ReactNode;
  illustrationSize?: number;
}

const DEFAULT_TITLE = i18n.translate('xpack.observability.sigeventsOverview.rootCausePanel.title', {
  defaultMessage: 'Root cause',
});

/**
 * Renders a span styled with the theme's monospace font.
 * Use for technical tokens inside the root cause description
 * (identifiers, codes, IPs, pod names, protocols).
 */
export function RootCauseCode({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        font-family: ${euiTheme.font.familyCode};
        font-size: 0.9em;
      `}
    >
      {children}
    </span>
  );
}

function DefaultDescription() {
  const { euiTheme } = useEuiTheme();

  const codeCss = css`
    font-family: ${euiTheme.font.familyCode};
    font-size: 0.9em;
  `;

  return (
    <p>
      {"The checkout service's "}
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.placeorderLabel', {
          defaultMessage: 'placeOrder',
        })}
      </span>{' '}
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.grpcLabel', {
          defaultMessage: 'gRPC',
        })}
      </span>
      {' call fails with '}
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.econnrefusedLabel', {
          defaultMessage: 'ECONNREFUSED',
        })}
      </span>
      {' to '}
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.Label', {
          defaultMessage: '10.103.136.237:9999',
        })}
      </span>
      {
        ' — the payment service\'s upstream dependency remains unreachable. Confirmed by KI query "Payment processing failures" returning 5 rows at 09:08 UTC, all showing '
      }
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.grpcCodeLabel', {
          defaultMessage: 'gRPC code 13',
        })}
      </span>
      {' INTERNAL with connection refused errors originating from the frontend pod ('}
      <span css={codeCss}>
        {i18n.translate('xpack.observability.defaultDescription.span.frontendbcdgztbLabel', {
          defaultMessage: 'frontend-68b84c4d76-g2ztb',
        })}
      </span>
      {
        ') via the checkout API route. The failure has persisted for 3.5+ hours since onset at ~05:30 UTC with intermittent recovery/resurgence cycles.'
      }
    </p>
  );
}

export function RootCausePanel({
  title = DEFAULT_TITLE,
  children,
  illustrationSize = DEFAULT_ILLUSTRATION_SIZE,
}: RootCausePanelProps) {
  const hasPlaceholderData = !children;

  return (
    <DevModePlaceholder hasPlaceholderData={hasPlaceholderData}>
      <div data-test-subj="sigeventsOverviewRootCausePanel">
        <InfoPanel
          color="primary"
          title={title}
          titleIcon={<RootCauseIllustration size={illustrationSize} />}
        >
          <EuiText size="s">{children ?? <DefaultDescription />}</EuiText>
        </InfoPanel>
      </div>
    </DevModePlaceholder>
  );
}
