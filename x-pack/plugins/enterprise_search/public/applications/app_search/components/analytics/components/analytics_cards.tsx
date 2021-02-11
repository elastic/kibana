/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

interface Props {
  stats: Array<{
    text: string;
    stat: number;
    dataTestSubj?: string;
  }>;
}
export const AnalyticsCards: React.FC<Props> = ({ stats }) => (
  <EuiFlexGroup>
    {stats.map(({ text, stat, dataTestSubj }) => (
      <EuiFlexItem key={text}>
        <EuiPanel>
          <EuiStat
            title={stat}
            description={text}
            titleColor="primary"
            data-test-subj={dataTestSubj}
          />
        </EuiPanel>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
