/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { INSIGHTS_HEADER_TEST_ID } from './test_ids';
import { TestProviders } from '../../../../common/mock';
import { useRiskScore } from '../../../../explore/containers/risk_score';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { InsightsSection } from './insights_section';
import { useAlertPrevalence } from '../../../../common/containers/alerts/use_alert_prevalence';

jest.mock('../../../../common/containers/alerts/use_alert_prevalence');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => jest.fn().mockReturnValue({ pathname: '/overview' }),
  };
});
(useAlertPrevalence as jest.Mock).mockReturnValue({
  loading: false,
  error: false,
  count: 0,
  alertIds: [],
});

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const selectedPatterns = 'alerts';

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseSourcererDataView = jest.fn().mockReturnValue({ selectedPatterns });
jest.mock('../../../../common/containers/sourcerer', () => {
  return {
    useSourcererDataView: (...props: unknown[]) => mockUseSourcererDataView(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as jest.Mock;
jest.mock('../../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../explore/containers/risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../../common/containers/use_first_last_seen');

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../../explore/hosts/containers/hosts/details');

jest.mock('../hooks/use_fetch_threat_intelligence');

jest.mock('../../shared/hooks/use_prevalence');

const renderInsightsSection = (contextValue: RightPanelContext, expanded: boolean) =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={contextValue}>
        <InsightsSection expanded={expanded} />
      </RightPanelContext.Provider>
    </TestProviders>
  );

describe('<InsightsSection />', () => {
  beforeEach(() => {
    mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
    mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
    mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
  });

  it('should render insights component', () => {
    const contextValue = {
      eventId: 'some_Id',
      getFieldsData: mockGetFieldsData,
    } as unknown as RightPanelContext;

    const wrapper = renderInsightsSection(contextValue, false);

    expect(wrapper.getByTestId(INSIGHTS_HEADER_TEST_ID)).toBeInTheDocument();
    expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(wrapper.getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });

  it('should render insights component as expanded when expanded is true', () => {
    const contextValue = {
      eventId: 'some_Id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: mockGetFieldsData,
    } as unknown as RightPanelContext;

    const wrapper = renderInsightsSection(contextValue, true);

    expect(wrapper.getByTestId(INSIGHTS_HEADER_TEST_ID)).toBeInTheDocument();
    expect(wrapper.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
    expect(wrapper.getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });
});
