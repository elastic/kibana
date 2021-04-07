/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { render, mockUrlStorage, mockCore } from './rtl_helpers';
import { ExploratoryView } from './exploratory_view';
import { getStubIndexPattern } from '../../../../../../../src/plugins/data/public/test_utils';
import * as obsvInd from '../../../utils/observability_index_patterns';

describe('ExploratoryView', () => {
  beforeEach(() => {
    const indexPattern = getStubIndexPattern(
      'apm-*',
      () => {},
      '@timestamp',
      [
        {
          name: '@timestamp',
          type: 'date',
          esTypes: ['date'],
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
      ],
      mockCore() as any
    );

    jest.spyOn(obsvInd, 'ObservabilityIndexPatterns').mockReturnValue({
      getIndexPattern: jest.fn().mockReturnValue(indexPattern),
    } as any);
  });

  it('renders exploratory view', async () => {
    render(<ExploratoryView />);

    await waitFor(() => {
      screen.getByText(/open in lens/i);
      screen.getByRole('heading', { name: /exploratory view/i });
      screen.getByRole('img', { name: /visulization/i });
      screen.getByText(/add series/i);
      screen.getByText(/no series found, please add a series\./i);
    });
  });

  it('can add, cancel new series', async () => {
    render(<ExploratoryView />);

    await fireEvent.click(screen.getByText(/add series/i));

    await waitFor(() => {
      screen.getByText(/open in lens/i);
    });

    await waitFor(() => {
      screen.getByText(/select a data type to start building a series\./i);
    });

    await fireEvent.click(screen.getByText(/cancel/i));

    await waitFor(() => {
      screen.getByText(/add series/i);
    });
  });

  it('renders lens component when there is series', async () => {
    mockUrlStorage({
      data: {
        'uptime-pings-histogram': {
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<ExploratoryView />);

    await waitFor(() => {
      screen.getByText(/open in lens/i);
      screen.getByRole('heading', { name: /uptime pings/i });
      screen.getByText(/uptime-pings-histogram/i);
      screen.getByText(/Lens Embeddable Component/i);
      screen.getByRole('table', { name: /this table contains 1 rows\./i });
    });
  });
});
