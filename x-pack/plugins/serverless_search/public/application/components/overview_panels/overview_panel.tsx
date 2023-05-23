/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { LEARN_MORE_LABEL } from '../../../../common/i18n_string';

interface OverviewPanelProps {
  description: React.ReactNode | string;
  leftPanelContent: React.ReactNode;
  links: Array<{ label: string; href: string }>;
  title: string;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  children,
  description,
  leftPanelContent,
  links,
  title,
}) => {
  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={6}>{leftPanelContent}</EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiPanel color="subdued">
            <EuiTitle>
              <h2>{title}</h2>
            </EuiTitle>
            <EuiSpacer />
            <EuiText>{description}</EuiText>
            {children}
            {links.length > 0 ? (
              <>
                <EuiSpacer />
                <EuiTitle size="xxs">
                  <h3>{LEARN_MORE_LABEL}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {links.map(({ label, href }, index) => (
                  <EuiText size="s">
                    <EuiLink key={index} href={href} target="_blank">
                      {label}
                    </EuiLink>
                  </EuiText>
                ))}
              </>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
    </>
  );
};
