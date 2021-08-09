/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/dom';
import { render, mockCore, mockAppIndexPattern } from './rtl_helpers';
import { ExploratoryView } from './exploratory_view';
import { getStubIndexPattern } from '../../../../../../../src/plugins/data/public/test_utils';
import * as obsvInd from './utils/observability_index_patterns';
import * as pluginHook from '../../../hooks/use_plugin_context';

jest.spyOn(pluginHook, 'usePluginContext').mockReturnValue({
  appMountParameters: {
    setHeaderActionMenu: jest.fn(),
  },
} as any);

describe('ExploratoryView', () => {
  mockAppIndexPattern();

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

    expect(await screen.findByText(/Preview/i)).toBeInTheDocument();
    expect(await screen.findByText(/Configure series/i)).toBeInTheDocument();
    expect(await screen.findByText(/Hide chart/i)).toBeInTheDocument();
    expect(await screen.findByText(/Refresh/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /Performance Distribution/i })
    ).toBeInTheDocument();
  });

  it('renders lens component when there is series', async () => {
    render(<ExploratoryView />);

    expect((await screen.findAllByText('Performance distribution'))[0]).toBeInTheDocument();
    expect(await screen.findByText(/Lens Embeddable Component/i)).toBeInTheDocument();

    await waitFor(() => {
      screen.getByRole('table', { name: /this table contains 1 rows\./i });
    });
  });
});
