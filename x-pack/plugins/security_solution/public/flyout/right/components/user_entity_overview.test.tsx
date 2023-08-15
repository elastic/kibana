/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { UserEntityOverview } from './user_entity_overview';
import { useRiskScore } from '../../../explore/containers/risk_score';

import {
  ENTITIES_USER_OVERVIEW_IP_TEST_ID,
  ENTITIES_USER_OVERVIEW_LINK_TEST_ID,
  ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID,
  TECHNICAL_PREVIEW_ICON_TEST_ID,
} from './test_ids';
import { useObservedUserDetails } from '../../../explore/users/containers/users/observed_details';
import { mockContextValue } from '../mocks/mock_right_panel_context';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';

const userName = 'user';
const ip = '10.200.000.000';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const selectedPatterns = 'alerts';
const userData = { host: { ip: [ip] } };
const riskLevel = [{ user: { risk: { calculated_level: 'Medium' } } }];

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseSourcererDataView = jest.fn().mockReturnValue({ selectedPatterns });
jest.mock('../../../common/containers/sourcerer', () => {
  return {
    useSourcererDataView: (...props: unknown[]) => mockUseSourcererDataView(...props),
  };
});

const mockUseUserDetails = useObservedUserDetails as jest.Mock;
jest.mock('../../../explore/users/containers/users/observed_details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../explore/containers/risk_score');

describe('<UserEntityOverview />', () => {
  describe('license is valid', () => {
    it('should render ip addresses and user risk classification', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <RightPanelContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </RightPanelContext.Provider>
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_USER_OVERVIEW_IP_TEST_ID)).toHaveTextContent(ip);
      expect(getByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Medium');
    });

    it('should render correctly if returned data is null', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <RightPanelContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </RightPanelContext.Provider>
        </TestProviders>
      );
      expect(getByTestId(ENTITIES_USER_OVERVIEW_IP_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Unknown');
    });
  });

  describe('license is not valid', () => {
    it('should render ip but not user risk classification', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: false });
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <RightPanelContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </RightPanelContext.Provider>
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_USER_OVERVIEW_IP_TEST_ID)).toHaveTextContent(ip);
      expect(queryByTestId(ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <RightPanelContext.Provider value={panelContextValue}>
            <UserEntityOverview userName={userName} />
          </RightPanelContext.Provider>
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_USER_OVERVIEW_IP_TEST_ID)).toHaveTextContent('—');
      expect(queryByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should navigate to left panel entities tab when clicking on title', () => {
      mockUseUserDetails.mockReturnValue([false, { userDetails: userData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
            <RightPanelContext.Provider value={panelContextValue}>
              <UserEntityOverview userName={userName} />
            </RightPanelContext.Provider>
          </ExpandableFlyoutContext.Provider>
        </TestProviders>
      );

      getByTestId(ENTITIES_USER_OVERVIEW_LINK_TEST_ID).click();
      expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
        id: LeftPanelKey,
        path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
        params: {
          id: panelContextValue.eventId,
          indexName: panelContextValue.indexName,
          scopeId: panelContextValue.scopeId,
        },
      });
    });
  });
});
