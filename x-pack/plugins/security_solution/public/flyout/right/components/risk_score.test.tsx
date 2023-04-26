/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import {
  FLYOUT_HEADER_RISK_SCORE_TITLE_TEST_ID,
  FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID,
} from './test_ids';
import { RiskScore } from './risk_score';
import { mockGetFieldsData } from '../mocks/mock_context';

describe('<RiskScore />', () => {
  it('should render risk score information', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <RightPanelContext.Provider value={contextValue}>
        <RiskScore />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(FLYOUT_HEADER_RISK_SCORE_TITLE_TEST_ID)).toBeInTheDocument();
    const riskScore = getByTestId(FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID);
    expect(riskScore).toBeInTheDocument();
    expect(riskScore).toHaveTextContent('0');
  });

  it('should render empty component if missing getFieldsData value', () => {
    const contextValue = {
      getFieldsData: jest.fn(),
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={contextValue}>
        <RiskScore />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if getFieldsData is invalid', () => {
    const contextValue = {
      getFieldsData: jest.fn().mockImplementation(() => 123),
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={contextValue}>
        <RiskScore />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
