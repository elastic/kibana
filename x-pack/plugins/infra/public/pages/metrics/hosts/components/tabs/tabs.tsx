/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiSpacer, type EuiTabbedContentTab } from '@elastic/eui';
import React from 'react';
import { MetricsGrid } from './metrics/metrics_grid';

interface WrapperProps {
  children: React.ReactElement;
}
const Wrapper = ({ children }: WrapperProps) => {
  return (
    <>
      <EuiSpacer size="s" />
      {children}
    </>
  );
};
export const Tabs = () => {
  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'metrics',
      name: 'Metrics',
      'data-test-subj': 'hostsView_tabs_metrics',
      content: (
        <Wrapper>
          <MetricsGrid />
        </Wrapper>
      ),
    },
  ];

  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[1]} autoFocus="selected" />;
};
