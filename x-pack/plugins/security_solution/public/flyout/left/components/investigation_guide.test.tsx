/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InvestigationGuide } from './investigation_guide';
import { LeftPanelContext } from '../context';
import { TestProviders } from '../../../common/mock';
import {
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_NO_DATA_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../mocks/mock_context';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';

jest.mock('../../shared/hooks/use_investigation_guide');

const renderInvestigationGuide = (context: LeftPanelContext = mockContextValue) => (
  <TestProviders>
    <LeftPanelContext.Provider value={context}>
      <InvestigationGuide />
    </LeftPanelContext.Provider>
  </TestProviders>
);

describe('<InvestigationGuide />', () => {
  it('should render investigation guide', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });
    const { queryByTestId } = render(renderInvestigationGuide());
    expect(queryByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: true,
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message when there is no ruleId', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: {},
      ruleNote: 'test note',
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message when there is no rule note', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: undefined,
    });
    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toBeInTheDocument();
  });

  it('should render null when dataFormattedForFieldBrowser is null', () => {
    const mockContext = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: null,
    };
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
    });
    const { container } = render(renderInvestigationGuide(mockContext));
    expect(container).toBeEmptyDOMElement();
  });

  it('should render null useInvestigationGuide errors out', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });
    const { container } = render(renderInvestigationGuide());
    expect(container).toBeEmptyDOMElement();
  });
});
