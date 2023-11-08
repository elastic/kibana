/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPanelProps,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

interface StepPanelProps {
  title?: string;
  panelProps?: EuiPanelProps;
  panelFooter?: ReactNode;
  children?: ReactNode;
}

export function StepPanel(props: StepPanelProps) {
  const { title, children, panelFooter } = props;
  const panelProps = props.panelProps ?? null;
  return (
    <>
      <EuiPanel {...panelProps}>
        <EuiFlexGroup direction="column" gutterSize="none">
          {title ? (
            <>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2>{title}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiSpacer size="m" />
            </>
          ) : (
            <EuiSpacer size="s" />
          )}
          {children}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
      {panelFooter}
    </>
  );
}

interface StepPanelContentProps {
  children?: ReactNode;
}
export function StepPanelContent(props: StepPanelContentProps) {
  const { children } = props;
  return <EuiFlexItem>{children}</EuiFlexItem>;
}

interface StepPanelFooterProps {
  children?: ReactNode;
  items?: ReactNode[];
}
export function StepPanelFooter(props: StepPanelFooterProps) {
  const { items = [], children } = props;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false} style={{ marginBottom: euiTheme.size.l }}>
      {children}
      {items && (
        <EuiFlexGroup justifyContent="spaceBetween">
          {items.map((itemReactNode, index) => (
            <EuiFlexItem key={index} grow={false}>
              {itemReactNode}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  );
}
