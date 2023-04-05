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
import { SessionView } from './session_view';

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
      getFieldsData: () => ({
        process: {
          entry_leader: {
            entity_id: 'id',
          },
        },
      }),
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
