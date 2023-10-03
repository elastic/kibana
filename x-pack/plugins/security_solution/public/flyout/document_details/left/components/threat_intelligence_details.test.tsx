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
import {
  THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID,
} from './test_ids';
import { ThreatIntelligenceDetails } from './threat_intelligence_details';
import { useThreatIntelligenceDetails } from '../hooks/use_threat_intelligence_details';

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

jest.mock('../hooks/use_threat_intelligence_details');

const defaultContextValue = {
  getFieldsData: () => 'id',
} as unknown as LeftPanelContext;

// Renders System Under Test
const renderThreatIntelligenceDetails = (contextValue: LeftPanelContext) =>
  render(
    <TestProviders>
      <LeftPanelContext.Provider value={contextValue}>
        <ThreatIntelligenceDetails />
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('<ThreatIntelligenceDetails />', () => {
  it('should render the view', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      isLoading: true,
      enrichments: [],
      isEventDataLoading: false,
      isEnrichmentsLoading: true,
      range: { from: '', to: '' },
      setRange: () => {},
      eventFields: {},
    });

    const wrapper = renderThreatIntelligenceDetails(defaultContextValue);

    expect(
      wrapper.getByTestId(THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID)
    ).toBeInTheDocument();

    expect(useThreatIntelligenceDetails).toHaveBeenCalled();
  });

  it('should render loading spinner when event details are pending', () => {
    jest.mocked(useThreatIntelligenceDetails).mockReturnValue({
      isLoading: true,
      enrichments: [],
      isEventDataLoading: true,
      isEnrichmentsLoading: true,
      range: { from: '', to: '' },
      setRange: () => {},
      eventFields: {},
    });

    const wrapper = renderThreatIntelligenceDetails(defaultContextValue);

    expect(wrapper.getByTestId(THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();

    expect(useThreatIntelligenceDetails).toHaveBeenCalled();
  });
});
