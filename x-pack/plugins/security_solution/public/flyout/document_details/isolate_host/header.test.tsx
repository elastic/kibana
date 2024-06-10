/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useIsolateHostPanelContext } from './context';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { PanelHeader } from './header';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { isAlertFromSentinelOneEvent } from '../../../common/utils/sentinelone_alert_check';
import { isAlertFromCrowdstrikeEvent } from '../../../common/utils/crowdstrike_alert_check';
import { TECHNICAL_PREVIEW } from '../../../common/translations';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/utils/sentinelone_alert_check');
jest.mock('../../../common/utils/crowdstrike_alert_check');
jest.mock('./context');

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockIsAlertFromSentinelOneEvent = isAlertFromSentinelOneEvent as jest.Mock;
const mockIsAlertFromCrowdstrike = isAlertFromCrowdstrikeEvent as jest.Mock;

const renderPanelHeader = () =>
  render(
    <IntlProvider locale="en">
      <PanelHeader />
    </IntlProvider>
  );

describe('<PanelHeader />', () => {
  beforeEach(() => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockIsAlertFromSentinelOneEvent.mockReturnValue(false);
    mockIsAlertFromCrowdstrike.mockReturnValue(false);
  });

  it.each([
    {
      isolateAction: 'isolateHost',
      title: 'Isolate host',
    },
    {
      isolateAction: 'unisolateHost',
      title: 'Release host',
    },
  ])('should display release host message', ({ isolateAction, title }) => {
    (useIsolateHostPanelContext as jest.Mock).mockReturnValue({ isolateAction });

    const { getByTestId } = renderPanelHeader();

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent(title);
  });

  it.each([
    {
      action: 'isolateHost',
      alertCheck: mockIsAlertFromSentinelOneEvent,
      description: 'SentinelOne',
    },
    {
      action: 'unisolateHost',
      alertCheck: mockIsAlertFromSentinelOneEvent,
      description: 'SentinelOne',
    },
    {
      action: 'isolateHost',
      alertCheck: mockIsAlertFromCrowdstrike,
      description: 'Crowdstrike',
    },
    {
      action: 'unisolateHost',
      alertCheck: mockIsAlertFromCrowdstrike,
      description: 'Crowdstrike',
    },
  ])(
    'should display beta badge on $description alerts for %s host message',
    ({ action, alertCheck }) => {
      (useIsolateHostPanelContext as jest.Mock).mockReturnValue({
        isolateAction: action,
      });
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      alertCheck.mockReturnValue(true);

      const { getByTestId } = renderPanelHeader();

      expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent(TECHNICAL_PREVIEW);
    }
  );

  it.each([
    {
      action: 'isolateHost',
      alertCheck: mockIsAlertFromSentinelOneEvent,
      description: 'SentinelOne',
    },
    {
      action: 'unisolateHost',
      alertCheck: mockIsAlertFromSentinelOneEvent,
      description: 'SentinelOne',
    },
    {
      action: 'isolateHost',
      alertCheck: mockIsAlertFromCrowdstrike,
      description: 'Crowdstrike',
    },
    {
      action: 'unisolateHost',
      alertCheck: mockIsAlertFromCrowdstrike,
      description: 'Crowdstrike',
    },
  ])(
    'should not display beta badge on $description alerts for %s host message',
    ({ action, alertCheck }) => {
      (useIsolateHostPanelContext as jest.Mock).mockReturnValue({
        isolateAction: action,
      });
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      alertCheck.mockReturnValue(false);

      const { getByTestId } = renderPanelHeader();

      expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).not.toHaveTextContent(TECHNICAL_PREVIEW);
    }
  );
});
