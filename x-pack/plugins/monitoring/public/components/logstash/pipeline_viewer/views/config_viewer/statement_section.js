/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  // EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';

const StatementSection = ({ headerText, icon, children }) => (
  <EuiPanel
    paddingSize="s"
    className="statementSection"
  >
    <EuiFlexGroup style={{ marginBottom: "2px" }}>
      <EuiFlexItem grow={false}>
        {icon}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{headerText}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
    <ul>
      {
        children
      }
    </ul>
  </EuiPanel>
);

export const renderSection = ({ headerText, iconType, children }) => (
  [
    <StatementSection
      headerText={headerText}
      icon={<EuiIcon size="l" type={iconType} />}
      children={children}
      key={headerText}
    />,
    <EuiSpacer
      size="s"
      key={`${headerText}_spacer`}
    />
  ]
);
