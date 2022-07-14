/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiStatProps } from '@elastic/eui';

interface StatRowProps {
  items: EuiStatProps[];
}

export const StatRow: React.FC<StatRowProps> = ({ items }) => {
  return (
    <EuiFlexGroup direction="row">
      {items.map((item, index) => (
        <EuiFlexItem key={index}>
          <EuiPanel color="success" hasShadow={false} paddingSize="l">
            <EuiStat {...item} />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
