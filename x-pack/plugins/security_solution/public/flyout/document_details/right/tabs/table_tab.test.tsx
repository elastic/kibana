/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentDetailsContext } from '../../shared/context';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { TableTab } from './table_tab';
import { TestProviders } from '../../../../common/mock';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID } from '../components/test_ids';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('<TableTab />', () => {
  it('should render table component', () => {
    const contextValue = {
      eventId: 'some_Id',
      browserFields: {},
      dataFormattedForFieldBrowser: [],
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should renders the column headers and a field/value pair', () => {
    const { getAllByTestId, getByText } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByText('Field')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    expect(getByText('kibana.alert.workflow_status')).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();
    expect(getAllByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID).length).toBeGreaterThan(0);
  });

  it('should filter the table correctly', () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    userEvent.type(getByTestId(TABLE_TAB_SEARCH_INPUT_TEST_ID), 'test');
    expect(queryByText('kibana.alert.workflow_status')).not.toBeInTheDocument();
    expect(queryByText('open')).not.toBeInTheDocument();
    expect(queryByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID)).not.toBeInTheDocument();
  });
});
