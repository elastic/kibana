/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { RuleTypeModel, ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { ruleTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/rule_type_registry.mock';
import { waitFor } from '@testing-library/react';
import { Chance } from 'chance';
import React, { Fragment } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { ConfigSchema } from '../../plugin';
import { Subset } from '../../typings';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { AlertDetails } from './alert_details';
import { alertDetail, alertWithNoData } from './mock/alert';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('../../utils/kibana_react');
const validationMethod = (): ValidationResult => ({ errors: {} });
const ruleType: RuleTypeModel = {
  id: 'logs.alert.document.count',
  iconClass: 'test',
  description: 'Testing',
  documentationUrl: 'https://...',
  requiresAppContext: false,
  validate: validationMethod,
  ruleParamsExpression: () => <Fragment />,
  alertDetailsAppSection: () => <Fragment />,
};
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const useKibanaMock = useKibana as jest.Mock;

const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

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
      observabilityAIAssistant: mockObservabilityAIAssistant,
      theme: {},
      triggersActionsUi: {
        ruleTypeRegistry,
      },
    },
  });
};

jest.mock('../../hooks/use_fetch_alert_detail');
jest.mock('../../hooks/use_fetch_rule', () => {
  return {
    useFetchRule: () => ({
      reloadRule: jest.fn(),
      rule: {
        id: 'ruleId',
        name: 'ruleName',
      },
    }),
  };
});
jest.mock('@kbn/observability-shared-plugin/public');

const useFetchAlertDetailMock = useFetchAlertDetail as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useLocationMock = useLocation as jest.Mock;
const useBreadcrumbsMock = useBreadcrumbs as jest.Mock;

const chance = new Chance();

const params = {
  alertId: chance.guid(),
};

const config: Subset<ConfigSchema> = {
  unsafe: {
    alertDetails: {
      metrics: { enabled: true },
      uptime: { enabled: true },
    },
  },
};

describe('Alert details', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');

  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue(params);
    useLocationMock.mockReturnValue({ pathname: '/alerts/uuid', search: '', state: '', hash: '' });
    useBreadcrumbsMock.mockReturnValue([]);
    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    ruleTypeRegistry.has.mockReturnValue(true);
    mockKibana();
  });

  const renderComponent = () =>
    render(
      <IntlProvider locale="en">
        <AlertDetails />
      </IntlProvider>,
      config
    );

  it('should show the alert detail page with all necessary components', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alertDetail]);

    const alertDetails = renderComponent();

    await waitFor(() => expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy());

    expect(alertDetails.queryByTestId('alertDetails')).toBeTruthy();
    expect(alertDetails.queryByTestId('alertDetailsError')).toBeFalsy();
    expect(alertDetails.queryByTestId('alertDetailsPageTitle')).toBeTruthy();
    expect(alertDetails.queryByTestId('alertDetailsTabbedContent')).toBeTruthy();
    expect(alertDetails.queryByTestId('alert-summary-container')).toBeTruthy();
    expect(alertDetails.queryByTestId('overviewTab')).toBeTruthy();
    expect(alertDetails.queryByTestId('metadataTab')).toBeTruthy();
  });

  it('should show Metadata tab', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alertDetail]);

    const alertDetails = renderComponent();

    await waitFor(() => expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy());

    expect(alertDetails.queryByTestId('alertDetailsTabbedContent')?.textContent).toContain(
      'Metadata'
    );
    alertDetails.getByText('Metadata').click();
    expect(alertDetails.queryByTestId('metadataTabPanel')).toBeTruthy();
    expect(alertDetails.queryByTestId('metadataTabPanel')?.textContent).toContain(
      'kibana.alert.status'
    );
  });

  it('should show error loading the alert details', async () => {
    useFetchAlertDetailMock.mockReturnValue([false, alertWithNoData]);

    const alertDetails = renderComponent();

    expect(alertDetails.queryByTestId('alertDetailsError')).toBeTruthy();
    expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeFalsy();
    expect(alertDetails.queryByTestId('alertDetails')).toBeFalsy();
  });

  it('should show loading spinner', async () => {
    useFetchAlertDetailMock.mockReturnValue([true, alertWithNoData]);

    const alertDetails = renderComponent();

    expect(alertDetails.queryByTestId('centerJustifiedSpinner')).toBeTruthy();
    expect(alertDetails.queryByTestId('alertDetailsError')).toBeFalsy();
    expect(alertDetails.queryByTestId('alertDetails')).toBeFalsy();
  });
});
