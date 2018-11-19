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
  docUrl: string;
  items: Array<{ title?: string; body: string }>;
  children?: ReactNode;
}

/**
 * Used to display a deprecation with links to docs, a health indicator, and other descriptive information.
 */
export const DeprecationCell: StatelessComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  docUrl,
  items,
  children,
}) => (
  <EuiFlexItem className="upgrade-checkup__deprecation-cell">
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
      <EuiFlexItem grow={false}>
        <EuiButton size="s" href={docUrl} target="_blank">
          Read Documentation
        </EuiButton>
      </EuiFlexItem>
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
  </EuiFlexItem>
);
