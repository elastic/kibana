/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as stories from './service_overview.stories';
import * as useAdHocApmDataView from '../../../hooks/use_adhoc_apm_data_view';

const { Example } = composeStories(stories);

describe('ServiceOverview', () => {
  let useAdHocApmDataViewSpy: jest.SpyInstance;

  beforeAll(() => {
    useAdHocApmDataViewSpy = jest.spyOn(useAdHocApmDataView, 'useAdHocApmDataView');

    useAdHocApmDataViewSpy.mockImplementation(() => {
      return {
        dataView: {
          id: 'foo-1',
        },
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders', async () => {
    render(<Example />);

    expect(await screen.findByRole('heading', { name: 'Latency' })).toBeInTheDocument();
  });
});
