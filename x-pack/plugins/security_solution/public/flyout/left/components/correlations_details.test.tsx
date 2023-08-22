/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useCorrelations, type UseCorrelationsResult } from '../../shared/hooks/use_correlations';
import { CorrelationsDetails } from './correlations_details';
import { type GetRelatedCasesByAlertResponse } from '@kbn/cases-plugin/common';
import type { SelectedDataView } from '../../../common/store/sourcerer/model';
import { TestProviders } from '../../../common/mock';
import { LeftPanelContext } from '../context';
import { CaseStatuses } from '@kbn/cases-components';

jest.mock('../../../timelines/containers/details');
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../shared/hooks/use_correlations');

const mockCasesByAlertId: GetRelatedCasesByAlertResponse = [
  {
    id: '123',
    title: 'Mock Case',
    description: 'This is a mock case for testing purposes',
    status: CaseStatuses.open,
    createdAt: '2021-10-01T12:00:00Z',
    totals: {
      alerts: 5,
      userComments: 2,
    },
  },
];

const mockUseCorrelationsResult: UseCorrelationsResult = {
  loading: false,
  error: false,
  data: [],
  dataCount: 0,
  alertsBySessionIds: ['alert1', 'alert2', 'alert3'],
  sameSourceAlertsIds: ['alert1', 'alert2'],
  ancestryAlertsIds: ['alert3'],
  cases: mockCasesByAlertId,
};

const contextValue: LeftPanelContext = {
  indexName: 'index',
  eventId: 'event',
  getFieldsData: () => null,
  dataFormattedForFieldBrowser: [],
  dataAsNestedObject: null,
  scopeId: '',
  browserFields: null,
  searchHit: undefined,
  investigationFields: [],
};

const renderCorrelationDetails = () => {
  return render(
    <TestProviders>
      <LeftPanelContext.Provider value={contextValue}>
        <CorrelationsDetails />
      </LeftPanelContext.Provider>
    </TestProviders>
  );
};

describe('CorrelationsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(useSourcererDataView)
      .mockReturnValue({ runtimeMappings: {} } as unknown as SelectedDataView);
  });

  it('renders loading spinner when data is loading', () => {
    jest
      .mocked(useTimelineEventsDetails)
      .mockReturnValue([true, null, undefined, null, async () => {}]);
    jest.mocked(useCorrelations).mockReturnValue(mockUseCorrelationsResult);

    renderCorrelationDetails();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error message when there is an error', () => {
    jest
      .mocked(useTimelineEventsDetails)
      .mockReturnValue([false, null, undefined, null, async () => {}]);
    jest.mocked(useCorrelations).mockReturnValue({ ...mockUseCorrelationsResult, error: true });

    renderCorrelationDetails();

    expect(
      screen.getByText('There was an error displaying Correlation Details view')
    ).toBeInTheDocument();
  });

  it('renders alerts tables when data is loaded', () => {
    jest
      .mocked(useTimelineEventsDetails)
      .mockReturnValue([false, null, undefined, null, async () => {}]);
    jest.mocked(useCorrelations).mockReturnValue(mockUseCorrelationsResult);

    renderCorrelationDetails();

    expect(screen.getByText('1 alert related by ancestry')).toBeInTheDocument();
    expect(screen.getByText('2 alerts related by source event')).toBeInTheDocument();
    expect(screen.getByText('3 alerts related by session')).toBeInTheDocument();
  });
});
