/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { HostEntityOverview, HOST_PREVIEW_BANNER } from './host_entity_overview';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import {
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
} from './test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { LeftPanelInsightsTab } from '../../left';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';

const hostName = 'host';
const osFamily = 'Windows';
const lastSeen = '2022-04-08T18:35:45.064Z';
const lastSeenText = 'Apr 8, 2022 @ 18:35:45.064';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const selectedPatterns = 'alerts';
const hostData = { host: { os: { family: [osFamily] } } };
const riskLevel = [{ host: { risk: { calculated_level: 'Medium' } } }];

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

jest.mock('../../../../common/hooks/use_experimental_features');
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseSourcererDataView = jest.fn().mockReturnValue({ selectedPatterns });
jest.mock('../../../../sourcerer/containers', () => {
  return {
    useSourcererDataView: (...props: unknown[]) => mockUseSourcererDataView(...props),
  };
});

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../../explore/hosts/containers/hosts/details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
jest.mock('../../../../common/containers/use_first_last_seen');

const renderHostEntityContent = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <HostEntityOverview hostName={hostName} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<HostEntityContent />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  describe('license is valid', () => {
    it('should render os family and host risk level', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent(osFamily);
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Medium');
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('—');
    });
  });

  it('should render loading if loading for host details is true', () => {
    mockUseHostDetails.mockReturnValue([true, { hostDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HostEntityOverview hostName={hostName} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading if loading for risk score is true', () => {
    mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
    mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true, loading: true });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <HostEntityOverview hostName={hostName} />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });
  describe('license is not valid', () => {
    it('should render os family and last seen', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen }]);

      const { getByTestId, queryByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent(osFamily);
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent(lastSeenText);
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
      mockUseFirstLastSeen.mockReturnValue([false, { lastSeen: null }]);

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID)).toHaveTextContent('—');
    });

    it('should navigate to left panel entities tab when clicking on title when feature flag is off', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = renderHostEntityContent();

      getByTestId(ENTITIES_HOST_OVERVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openLeftPanel).toHaveBeenCalledWith({
        id: DocumentDetailsLeftPanelKey,
        path: { tab: LeftPanelInsightsTab, subTab: ENTITIES_TAB_ID },
        params: {
          id: panelContextValue.eventId,
          indexName: panelContextValue.indexName,
          scopeId: panelContextValue.scopeId,
        },
      });
    });

    it('should open host preview when clicking on title when feature flag is on', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

      const { getByTestId } = renderHostEntityContent();

      getByTestId(ENTITIES_HOST_OVERVIEW_LINK_TEST_ID).click();
      expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
        id: HostPreviewPanelKey,
        params: {
          hostName,
          scopeId: mockContextValue.scopeId,
          banner: HOST_PREVIEW_BANNER,
        },
      });
    });
  });
});
