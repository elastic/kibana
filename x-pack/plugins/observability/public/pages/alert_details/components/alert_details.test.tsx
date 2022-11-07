/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { useParams } from 'react-router-dom';
import { Chance } from 'chance';
import { waitFor } from '@testing-library/react';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

import { render } from '../../../utils/test_helper';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { AlertDetails } from './alert_details';
import { ConfigSchema } from '../../../plugin';
import { alert, alertWithNoData } from '../mock/alert';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      cases: casesPluginMock.createStartContract(),
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
      triggersActionsUi: triggersActionsUiMock.createStart(),
    },
  });
};

jest.mock('../../../hooks/use_fetch_alert_detail');
jest.mock('../../../hooks/use_breadcrumbs');
jest.mock('../../../hooks/use_get_user_cases_permissions', () => ({
  useGetUserCasesPermissions: () => ({
    all: true,
    create: true,
    delete: true,
    push: true,
    read: true,
    update: true,
  }),
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
    alertDetails: {
      apm: { enabled: true },
      logs: { enabled: true },
      metrics: { enabled: true },
      uptime: { enabled: true },
    },
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
    mockKibana();
  });

  it('should show the alert detail page with all necessary components', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alert]);

    const alertDetails = render(<AlertDetails />, config);

    await waitFor(() => expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy());

    expect(alertDetails.queryByTestId('alertDetails')).toBeTruthy();
    expect(alertDetails.queryByTestId('alertDetailsError')).toBeFalsy();
    expect(alertDetails.queryByTestId('page-title-container')).toBeTruthy();
    expect(alertDetails.queryByTestId('alert-summary-container')).toBeTruthy();
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
