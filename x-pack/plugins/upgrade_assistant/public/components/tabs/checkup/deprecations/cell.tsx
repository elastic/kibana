/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, StatelessComponent } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface DeprecationCellProps {
  items?: Array<{ title?: string; body: string }>;
  docUrl?: string;
  headline?: string;
  healthColor?: string;
  actions?: Array<{
    label: string;
    url: string;
  }>;
  children?: ReactNode;
}

/**
 * Used to display a deprecation with links to docs, a health indicator, and other descriptive information.
 */
export const DeprecationCell: StatelessComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  actions,
  docUrl,
  items = [],
  children,
}) => (
  <div className="upgDeprecationCell">
    <EuiFlexGroup responsive={false} wrap alignItems="baseline">
      {healthColor && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={healthColor} />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow>
        {headline && (
          <EuiTitle size="xxs">
            <h2>{headline}</h2>
          </EuiTitle>
        )}

        {docUrl && (
          <div>
            <EuiLink href={docUrl} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.deprecations.documentationButtonLabel"
                defaultMessage="Documentation"
              />
            </EuiLink>
            <EuiSpacer size="s" />
          </div>
        )}

        {items.map(item => (
          <div key={item.title || item.body}>
            <EuiText>
              {item.title && <h6>{item.title}</h6>}
              <p>{item.body}</p>
            </EuiText>
          </div>
        ))}
      </EuiFlexItem>

      {actions &&
        actions.map(button => (
          <EuiFlexItem key={button.url} grow={false}>
            <EuiButton size="s" href={button.url} target="_blank">
              {button.label}
            </EuiButton>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    {children}
  </div>
);
