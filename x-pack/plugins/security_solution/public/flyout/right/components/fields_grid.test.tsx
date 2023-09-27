/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { TestProvidersComponent } from '../../../common/mock';
import { RightPanelContext } from '../context';
import { FieldsGrid, type FieldsGridProps } from './fields_grid';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import type { BrowserFields } from '../../../../common/search_strategy';

const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as RightPanelContext;

const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;

const mockBrowserFields = {} as BrowserFields;

const mockData: FieldsGridProps['data'] = [
  {
    field: 'host.name',
    values: ['siem-kibana'],
    isObjectArray: false,
  },
  {
    field: 'host.os',
    values: ['Linux'],
    isObjectArray: false,
  },
];

const renderFieldsGrid = (contextValue: RightPanelContext) => {
  return render(
    <TestProvidersComponent>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <FieldsGrid
            browserFields={mockBrowserFields}
            data={mockData}
            eventId="123"
            scopeId="123"
            data-test-subj="fields-grid"
          />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProvidersComponent>
  );
};

describe('<FieldsGrid />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders the fields grid and all the values', () => {
    const { getByTestId } = renderFieldsGrid(mockContextValue);

    expect(getByTestId('fields-grid')).toBeInTheDocument();

    expect(screen.queryByText('host.name')).toBeInTheDocument();
    expect(screen.queryByText('siem-kibana')).toBeInTheDocument();
    expect(screen.queryByText('host.os')).toBeInTheDocument();
    expect(screen.queryByText('Linux')).toBeInTheDocument();
  });

  it('filters the values based on search input', async () => {
    const { getByTestId } = renderFieldsGrid(mockContextValue);

    const searchInput = getByTestId('fields-grid-searchInput');

    expect(searchInput).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'host.os' } });
    });

    jest.advanceTimersByTime(500);

    expect(screen.queryByText('host.name')).not.toBeInTheDocument();
    expect(screen.queryByText('siem-kibana')).not.toBeInTheDocument();
    expect(screen.queryByText('host.os')).toBeInTheDocument();
    expect(screen.queryByText('Linux')).toBeInTheDocument();
  });
});
