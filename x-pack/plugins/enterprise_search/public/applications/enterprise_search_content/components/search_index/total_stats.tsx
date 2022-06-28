/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

interface TotalStatsProps {
  lastUpdated: string;
  documentCount: number;
  indexHealth: string;
  ingestionType: string;
}

export const TotalStats: React.FC<TotalStatsProps> = ({
  lastUpdated,
  documentCount,
  indexHealth,
  ingestionType,
}) => {
  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <EuiPanel color="success" hasShadow={false} paddingSize="l">
          <EuiStat description="Ingestion type" title={ingestionType} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
          <EuiStat description="Document count" title={documentCount} />
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
          <EuiStat description="Index health" title={indexHealth} />
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
          <EuiStat description="Last Updated" title={lastUpdated} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
