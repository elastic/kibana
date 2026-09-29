/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { waitFor } from '@testing-library/react';
import { ServiceNodeMetrics } from '.';
import { renderWithContext } from '../../../../utils/test_helpers';

// Mock the breadcrumb hook
vi.mock('../../../../context/breadcrumbs/use_breadcrumb', () => {
      const mocked = {
      useBreadcrumb: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// Mock the data source hook
vi.mock('../../../../hooks/use_preferred_data_source_and_bucket_size', () => {
      const mocked = {
      usePreferredDataSourceAndBucketSize: vi.fn().mockReturnValue({
        source: {
          documentType: 'metrics',
          rollupInterval: '1m',
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks/use_apm_params', () => {
      const mocked = {
      useApmParams: vi.fn().mockReturnValue({
        query: {
          environment: 'ENVIRONMENT_ALL',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          kuery: '',
          serviceGroup: '',
          comparisonEnabled: false,
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('ServiceNodeMetrics', () => {
  it('renders without errors', async () => {
    waitFor(() => {});

    expect(() =>
      renderWithContext(<ServiceNodeMetrics serviceNodeName="test-node" />)
    ).not.toThrow();
  });
});
