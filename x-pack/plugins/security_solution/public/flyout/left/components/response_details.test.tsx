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
import { rawEventData, TestProviders } from '../../../common/mock';
import { RESPONSE_DETAILS_TEST_ID, RESPONSE_EMPTY_TEST_ID } from './test_ids';
import { ResponseDetails } from './response_details';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../../common/hooks/use_experimental_features');

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        osquery: {
          OsqueryResults: jest.fn().mockReturnValue(null),
          fetchAllLiveQueries: jest.fn().mockReturnValue({
            data: {
              data: {
                items: [
                  {
                    _id: 'testId',
                    _index: 'testIndex',
                    fields: {
                      action_id: ['testActionId'],
                      'queries.action_id': ['testQueryActionId'],
                      'queries.query': ['select * from users'],
                      '@timestamp': ['2022-09-08T18:16:30.256Z'],
                    },
                  },
                ],
              },
            },
          }),
        },
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
      },
    }),
  };
});

const defaultContextValue = {
  dataAsNestedObject: {
    _id: 'test',
  },
  searchHit: rawEventData,
} as unknown as LeftPanelContext;

const contextWithResponseActions = {
  ...defaultContextValue,
  searchHit: {
    ...rawEventData,
    fields: {
      ...rawEventData.fields,
      'agent.id': ['testAgent'],
      'kibana.alert.rule.name': ['test-rule'],
      'kibana.alert.rule.parameters': [
        {
          response_actions: [{ action_type_id: '.osquery' }],
        },
      ],
    },
  },
};

// Renders System Under Test
const renderSUT = (contextValue: LeftPanelContext) =>
  render(
    <TestProviders>
      <LeftPanelContext.Provider value={contextValue}>
        <ResponseDetails />
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('<ResponseDetails />', () => {
  let featureFlags: { endpointResponseActionsEnabled: boolean; responseActionsEnabled: boolean };

  beforeEach(() => {
    featureFlags = { endpointResponseActionsEnabled: true, responseActionsEnabled: true };

    const useIsExperimentalFeatureEnabledMock = (feature: keyof typeof featureFlags) =>
      featureFlags[feature];

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );
  });
  it('should render the view with response actions', () => {
    const wrapper = renderSUT(contextWithResponseActions);

    expect(wrapper.getByTestId(RESPONSE_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(wrapper.getByTestId('responseActionsViewWrapper')).toBeInTheDocument();
    expect(wrapper.queryByTestId('osqueryViewWrapper')).not.toBeInTheDocument();

    expect(wrapper.queryByTestId(RESPONSE_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });
  it('should render the view with osquery only', () => {
    featureFlags.responseActionsEnabled = true;
    featureFlags.endpointResponseActionsEnabled = false;

    const wrapper = renderSUT(contextWithResponseActions);

    expect(wrapper.getByTestId(RESPONSE_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(wrapper.queryByTestId('responseActionsViewWrapper')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('osqueryViewWrapper')).toBeInTheDocument();
  });
  it('should render the empty information', () => {
    const wrapper = renderSUT(defaultContextValue);

    expect(wrapper.getByTestId(RESPONSE_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(wrapper.queryByTestId('responseActionsViewWrapper')).not.toBeInTheDocument();
    expect(wrapper.queryByTestId('osqueryViewWrapper')).not.toBeInTheDocument();

    expect(wrapper.getByTestId(RESPONSE_EMPTY_TEST_ID)).toBeInTheDocument();
  });
});
