/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiSkeletonText } from '@elastic/eui';

export const OverviewGridItemLoader = () => {
  return (
    <EuiPanel style={{ height: '160px' }} hasBorder={true}>
      <EuiSkeletonText lines={2} />
    </EuiPanel>
  );
};
