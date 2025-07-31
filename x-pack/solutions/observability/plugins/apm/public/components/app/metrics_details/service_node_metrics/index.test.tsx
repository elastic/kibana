/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { ServiceNodeMetrics } from '.';
import { renderWithContext } from '../../../../utils/test_helpers';

// Mock the breadcrumb hook
jest.mock('../../../../context/breadcrumbs/use_breadcrumb', () => ({
  useBreadcrumb: jest.fn(),
}));

// Mock the data source hook
jest.mock('../../../../hooks/use_preferred_data_source_and_bucket_size', () => ({
  usePreferredDataSourceAndBucketSize: jest.fn().mockReturnValue({
    source: {
      documentType: 'metrics',
      rollupInterval: '1m',
    },
  }),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: jest.fn().mockReturnValue({
    query: {
      environment: 'ENVIRONMENT_ALL',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: '',
      serviceGroup: '',
      comparisonEnabled: false,
    },
  }),
}));

describe('ServiceNodeMetrics', () => {
  it('renders without errors', async () => {
    waitFor(() => {});

    expect(() =>
      renderWithContext(<ServiceNodeMetrics serviceNodeName="test-node" />)
    ).not.toThrowError();
  });
});
