/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  IconType,
} from '@elastic/eui';

interface Props {
  iconType?: IconType;
  subtitle: string;
  title: string;
}
export const AnalyticsSection: React.FC<Props> = ({ title, subtitle, iconType, children }) => (
  <section>
    <header>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
      >
        {iconType && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="l" />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{subtitle}</p>
      </EuiText>
    </header>
    <EuiSpacer size="m" />
    <EuiPageSection paddingSize="none">{children}</EuiPageSection>
  </section>
);
