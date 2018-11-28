/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, StatelessComponent } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

interface DeprecationCellProps {
  headline?: string;
  healthColor?: string;
  uiButtons: Array<{
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
  <div className="upgCell">
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow>
        {headline && (
          <EuiText>
            <h4>
              {healthColor && <EuiIcon type="dot" color={healthColor} />} {headline}
            </h4>
          </EuiText>
        )}
      </EuiFlexItem>
      {uiButtons.map(button => (
        <EuiFlexItem key={button.url} grow={false}>
          <EuiButton size="s" href={button.url} target="_blank">
            {button.label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>

    {items.map(item => (
      <div key={item.title}>
        <EuiSpacer size="m" />
        <EuiText>
          {item.title && <h6>{item.title}</h6>}
          <p>{item.body}</p>
        </EuiText>
      </div>
    ))}

    {children && (
      <div>
        <EuiSpacer size="m" />
        {children}
      </div>
    )}
  </div>
);
