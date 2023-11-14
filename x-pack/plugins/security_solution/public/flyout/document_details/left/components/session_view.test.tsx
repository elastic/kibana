/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeftPanelContext } from '../context';
import { TestProviders } from '../../../../common/mock';
import { SESSION_VIEW_TEST_ID } from './test_ids';
import { SessionView } from './session_view';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';

interface MockData {
  [key: string]: string;
}

const mockData: MockData = {
  [ENTRY_LEADER_ENTITY_ID]: 'id',
  [ENTRY_LEADER_START]: '2023-04-25T04:33:23.676Z',
  [ANCESTOR_INDEX]: '.ds-logs-endpoint.events.process-default',
};

const mockFieldsData = (prop: string) => {
  return mockData[prop];
};

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
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

const renderSessionView = (contextValue: LeftPanelContext) =>
  render(
    <TestProviders>
      <LeftPanelContext.Provider value={contextValue}>
        <SessionView />
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('<SessionView />', () => {
  it('renders session view correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.ds-logs-endpoint.events.process-default',
    } as unknown as LeftPanelContext;

    const wrapper = renderSessionView(contextValue);
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });

  it('renders session view from an alert correctly', () => {
    const contextValue = {
      getFieldsData: mockFieldsData,
      indexName: '.alerts-security', // it should prioritize KIBANA_ANCESTOR_INDEX above indexName
    } as unknown as LeftPanelContext;

    const wrapper = renderSessionView(contextValue);
    expect(wrapper.getByTestId(SESSION_VIEW_TEST_ID)).toBeInTheDocument();
  });
});
