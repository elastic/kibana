/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, StatelessComponent } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';

interface DeprecationCellProps {
  headline?: string;
  healthColor?: string;
  uiButtons?: Array<{
    label: string;
    url: string;
  }>;
  items: Array<{ title?: string; body: string }>;
  children?: ReactNode;
}

/**
 * Used to display a deprecation with links to docs, a health indicator, and other descriptive information.
 */
export const DeprecationCell: StatelessComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  uiButtons,
  items,
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

        {items.map(item => (
          <div key={item.title}>
            <EuiText>
              {item.title && <h6>{item.title}</h6>}
              <p>{item.body}</p>
            </EuiText>
          </div>
        ))}
      </EuiFlexItem>

      {uiButtons &&
        uiButtons.map(button => (
          <EuiFlexItem key={button.url} grow={false}>
            <EuiButton size="s" href={button.url} target="_blank">
              {button.label}
            </EuiButton>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>

    {children}
  </div>
);
