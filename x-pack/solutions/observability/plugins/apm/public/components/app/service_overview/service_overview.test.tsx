/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { composeStories } from '@storybook/react';
import { screen } from '@testing-library/react';
import React from 'react';
import * as stories from './service_overview.stories';
import * as useAdHocApmDataView from '../../../hooks/use_adhoc_apm_data_view';
import { renderWithTheme } from '../../../utils/test_helpers';

// Mock the usePerformanceContext hook
vi.mock('@kbn/ebt-tools', () => {
  const mocked = {
    usePerformanceContext: () => ({
      onPageReady: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const { Example } = composeStories(stories);

describe('ServiceOverview', () => {
  let useAdHocApmDataViewSpy: MockInstance;

  beforeAll(() => {
    useAdHocApmDataViewSpy = vi.spyOn(useAdHocApmDataView, 'useAdHocApmDataView');

    useAdHocApmDataViewSpy.mockImplementation(() => {
      return {
        dataView: {
          id: 'foo-1',
        },
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  it('renders', async () => {
    renderWithTheme(<Example />);

    expect(await screen.findByRole('heading', { name: 'Latency' })).toBeInTheDocument();
  });
});
