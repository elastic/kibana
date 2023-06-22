/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { TABLE_TAB_ERROR_TEST_ID, TABLE_TAB_CONTENT_TEST_ID } from './test_ids';
import { TableTab } from './table_tab';
import { TestProviders } from '../../../common/mock';

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
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <TableTab />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on null browserFields', () => {
    const contextValue = {
      eventId: 'some_Id',
      browserFields: null,
      dataFormattedForFieldBrowser: [],
    } as unknown as RightPanelContext;

    const { getByTestId, getByText } = render(
      <RightPanelContext.Provider value={contextValue}>
        <TableTab />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(TABLE_TAB_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display document information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the document fields and values')
    ).toBeInTheDocument();
  });

  it('should render error message on null dataFormattedForFieldBrowser', () => {
    const contextValue = {
      eventId: 'some_Id',
      browserFields: {},
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;

    const { getByTestId, getByText } = render(
      <RightPanelContext.Provider value={contextValue}>
        <TableTab />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(TABLE_TAB_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display document information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the document fields and values')
    ).toBeInTheDocument();
  });

  it('should render error message on null eventId', () => {
    const contextValue = {
      eventId: null,
      browserFields: {},
      dataFormattedForFieldBrowser: [],
    } as unknown as RightPanelContext;

    const { getByTestId, getByText } = render(
      <RightPanelContext.Provider value={contextValue}>
        <TableTab />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(TABLE_TAB_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display document information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the document fields and values')
    ).toBeInTheDocument();
  });
});
