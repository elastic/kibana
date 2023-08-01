/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { HostEntityOverview } from './host_entity_overview';
import { useRiskScore } from '../../../explore/containers/risk_score';
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import {
  ENTITIES_HOST_OVERVIEW_IP_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  TECHNICAL_PREVIEW_ICON_TEST_ID,
} from './test_ids';

const hostName = 'host';
const ip = '10.200.000.000';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const selectedPatterns = 'alerts';
const hostData = { host: { ip: [ip] } };
const riskLevel = [{ host: { risk: { calculated_level: 'Medium' } } }];

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

const mockUseHostDetails = useHostDetails as jest.Mock;
jest.mock('../../../explore/hosts/containers/hosts/details');

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../explore/containers/risk_score');

describe('<HostEntityContent />', () => {
  describe('license is valid', () => {
    it('should render ip addresses and host risk classification', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <HostEntityOverview hostName={hostName} />
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_IP_TEST_ID)).toHaveTextContent(ip);
      expect(getByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Medium');
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: true });

      const { getByTestId } = render(
        <TestProviders>
          <HostEntityOverview hostName={hostName} />
        </TestProviders>
      );
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_IP_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('Unknown');
    });
  });

  describe('license is not valid', () => {
    it('should render ip but not host risk classification', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: hostData }]);
      mockUseRiskScore.mockReturnValue({ data: riskLevel, isAuthorized: false });
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <HostEntityOverview hostName={hostName} />
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_IP_TEST_ID)).toHaveTextContent(ip);
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseHostDetails.mockReturnValue([false, { hostDetails: null }]);
      mockUseRiskScore.mockReturnValue({ data: null, isAuthorized: false });
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <HostEntityOverview hostName={hostName} />
        </TestProviders>
      );

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_IP_TEST_ID)).toHaveTextContent('—');
      expect(queryByTestId(TECHNICAL_PREVIEW_ICON_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
