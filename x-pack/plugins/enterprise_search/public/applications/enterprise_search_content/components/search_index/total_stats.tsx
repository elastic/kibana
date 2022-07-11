/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

interface TotalStatsProps {
  documentCount: number;
  indexHealth?: string;
  ingestionType: string;
  lastUpdated?: string;
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
        <EuiPanel color="primary" hasShadow={false} paddingSize="l">
          <EuiStat titleSize="m" description="Ingestion type" title={ingestionType} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
          <EuiStat titleSize="m" description="Document count" title={documentCount} />
        </EuiPanel>
      </EuiFlexItem>
      {indexHealth && (
        <EuiFlexItem>
          <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
            <EuiStat titleSize="m" description="Index health" title={indexHealth} />
          </EuiPanel>
        </EuiFlexItem>
      )}
      {lastUpdated && (
        <EuiFlexItem>
          <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
            <EuiStat titleSize="m" description="Last Updated" title={lastUpdated} />
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
