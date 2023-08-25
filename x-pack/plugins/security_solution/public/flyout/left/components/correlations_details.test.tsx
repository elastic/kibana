/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CorrelationsDetails } from './correlations_details';
import { TestProviders } from '../../../common/mock';
import { LeftPanelContext } from '../context';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_TEST_ID,
} from './test_ids';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import { mockContextValue } from '../mocks/mock_context';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('../../shared/hooks/use_show_related_alerts_by_ancestry');
jest.mock('../../shared/hooks/use_show_related_alerts_by_same_source_event');
jest.mock('../../shared/hooks/use_show_related_alerts_by_session');
jest.mock('../../shared/hooks/use_show_related_cases');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_session');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_ancestry');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_same_source_event');
jest.mock('../../shared/hooks/use_fetch_related_cases');

const renderCorrelationDetails = () => {
  return render(
    <TestProviders>
      <LeftPanelContext.Provider value={mockContextValue}>
        <CorrelationsDetails />
      </LeftPanelContext.Provider>
    </TestProviders>
  );
};

describe('CorrelationsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all sections', () => {
    jest
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: true, documentId: 'documentId', indices: ['index1'] });
    jest
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: true, originalEventId: 'originalEventId' });
    jest
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: true, entityId: 'entityId' });
    jest.mocked(useShowRelatedCases).mockReturnValue(true);

    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
      dataCount: 1,
    });

    const { getByTestId } = renderCorrelationDetails();

    expect(getByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render no section and show error message if show values are false', () => {
    jest
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: false, documentId: 'documentId', indices: ['index1'] });
    jest
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: false, originalEventId: 'originalEventId' });
    jest
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: false, entityId: 'entityId' });
    jest.mocked(useShowRelatedCases).mockReturnValue(false);

    const { getByTestId, queryByTestId } = renderCorrelationDetails();

    expect(queryByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(`${CORRELATIONS_DETAILS_TEST_ID}Error`)).toBeInTheDocument();
  });

  it('should render no section if values are null', () => {
    jest.mocked(useShowRelatedAlertsByAncestry).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedAlertsBySameSourceEvent).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedCases).mockReturnValue(false);

    const { queryByTestId } = renderCorrelationDetails();

    expect(queryByTestId(CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID)).not.toBeInTheDocument();
  });
});
