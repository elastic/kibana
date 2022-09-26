/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { render } from '../../../utils/test_helper';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { AlertDetails } from './alert_details';
import { Chance } from 'chance';
import { useParams } from 'react-router-dom';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { ConfigSchema } from '../../../plugin';
import { alert, alertWithNoData } from '../mock/alert';
import { waitFor } from '@testing-library/react';

jest.mock('../../../hooks/use_fetch_alert_detail');
jest.mock('../../../hooks/use_breadcrumbs');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const useFetchAlertDetailMock = useFetchAlertDetail as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useBreadcrumbsMock = useBreadcrumbs as jest.Mock;

const chance = new Chance();

const params = {
  alertId: chance.guid(),
};

const config = {
  unsafe: {
    alertDetails: { enabled: true },
  },
} as ConfigSchema;

describe('Alert details', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');

  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue(params);
    useBreadcrumbsMock.mockReturnValue([]);
  });

  it('should show alert summary', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alert]);

    const alertDetails = render(<AlertDetails />, config);

    expect(alertDetails.queryByTestId('alertDetails')).toBeTruthy();
    await waitFor(() => expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy());
    expect(alertDetails.queryByTestId('alertDetailsError')).toBeFalsy();
  });

  it('should show error loading the alert details', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alertWithNoData]);

    const alertDetails = render(<AlertDetails />, config);

    expect(alertDetails.queryByTestId('alertDetailsError')).toBeTruthy();
    expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy();
    expect(alertDetails.queryByTestId('alertDetails')).toBeFalsy();
  });

  it('should show loading spinner', async () => {
    useFetchAlertDetailMock.mockReturnValue([true, alertWithNoData]);

    const alertDetails = render(<AlertDetails />, config);

    expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeTruthy();
    expect(alertDetails.queryByTestId('alertDetailsError')).toBeFalsy();
    expect(alertDetails.queryByTestId('alertDetails')).toBeFalsy();
  });
});
