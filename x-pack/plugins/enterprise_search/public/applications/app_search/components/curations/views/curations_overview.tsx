/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiPanel } from '@elastic/eui';

import { CurationsTable, EmptyState } from '../components';
import { CurationsLogic } from '../curations_logic';

export const CurationsOverview: React.FC = () => {
  const { curations } = useValues(CurationsLogic);

  return curations.length ? (
    <EuiPanel hasBorder>
      <CurationsTable />
    </EuiPanel>
  ) : (
    <EmptyState />
  );
};
