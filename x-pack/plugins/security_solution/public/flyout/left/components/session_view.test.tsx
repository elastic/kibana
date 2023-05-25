/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { LeftPanelContext } from '../context';
import { LeftFlyoutContext } from '../context';
import { TestProviders } from '../../../common/mock';
import { SESSION_VIEW_ERROR_TEST_ID, SESSION_VIEW_TEST_ID } from './test_ids';
import {
  SessionView,
  SESSION_ENTITY_ID,
  SESSION_START_TIME,
  KIBANA_ANCESTOR_INDEX,
} from './session_view';

interface MockData {
  [key: string]: string;
}

const mockData: MockData = {
  [SESSION_ENTITY_ID]: 'id',
  [SESSION_START_TIME]: '2023-04-25T04:33:23.676Z',
  [KIBANA_ANCESTOR_INDEX]: '.ds-logs-endpoint.events.process-default',
};

const mockFieldsData = (prop: string) => {
  return mockData[prop];
};

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
      },
    }),
  };
});

describe('<SessionView />', () => {
  it('renders session view correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.ds-logs-endpoint.events.process-default',
    } as unknown as LeftPanelContext;

    const wrapper = render(
      <TestProviders>
        <LeftFlyoutContext.Provider value={contextValue}>
          <SessionView />
        </LeftFlyoutContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });

  it('renders session view from an alert correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.alerts-security', // it should prioritize KIBANA_ANCESTOR_INDEX above indexName
    } as unknown as LeftPanelContext;

    const wrapper = render(
      <TestProviders>
        <LeftFlyoutContext.Provider value={contextValue}>
          <SessionView />
        </LeftFlyoutContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on null eventId', () => {
    const contextValue = {
      getFieldsData: () => {},
    } as unknown as LeftPanelContext;

    const wrapper = render(
      <TestProviders>
        <LeftFlyoutContext.Provider value={contextValue}>
          <SessionView />
        </LeftFlyoutContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(SESSION_VIEW_ERROR_TEST_ID)).toBeInTheDocument();
    expect(wrapper.getByText('Unable to display session view')).toBeInTheDocument();
    expect(wrapper.getByText('There was an error displaying session view')).toBeInTheDocument();
  });
});
