/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React, { ReactNode } from 'react';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as useApmParamsHooks from '../../../hooks/use_apm_params';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { AlertsOverview } from '.';

const getAlertsStateTableMock = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const KibanaReactContext = createKibanaReactContext({
    triggersActionsUi: {
      getAlertsStateTable: getAlertsStateTableMock.mockReturnValue(
        <div data-test-subj="alerts-table" />
      ),
      alertsTableConfigurationRegistry: '',
    },
  } as Partial<CoreStart>);

  return (
    <MemoryRouter
      initialEntries={[
        '/services/opbeans/alerts?rangeFrom=now-24m&rangeTo=now&environment=testing',
      ]}
    >
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
    </MemoryRouter>
  );
}

const renderOptions = { wrapper: Wrapper };

describe('AlertsTable', () => {
  beforeEach(() => {
    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: {
        serviceName: 'opbeans',
      },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        environment: 'testing',
      },
    });
    jest.clearAllMocks();
  });

  it('renders alerts table in service overview', async () => {
    const { getByTestId } = render(<AlertsOverview />, renderOptions);

    await waitFor(async () => {
      expect(getByTestId('alerts-table')).toBeTruthy();
    });
  });
  it('should call alerts table with correct propts', async () => {
    act(() => {
      render(<AlertsOverview />, renderOptions);
    });

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenCalledWith(
        {
          alertsTableConfigurationRegistry: '',
          id: 'service-overview-alerts',
          configurationId: 'observability',
          featureIds: ['apm'],
          query: {
            bool: {
              filter: [
                {
                  term: { 'service.name': 'opbeans' },
                },
                {
                  term: { 'service.environment': 'testing' },
                },
              ],
            },
          },
          showExpandToDetails: false,
        },
        {}
      );
    });
  });

  it('should call alerts table with active filter', async () => {
    const { getByTestId } = render(<AlertsOverview />, renderOptions);

    await act(async () => {
      const inputEl = getByTestId('active');
      inputEl.click();
    });

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenLastCalledWith(
        {
          alertsTableConfigurationRegistry: '',
          id: 'service-overview-alerts',
          configurationId: 'observability',
          featureIds: ['apm'],
          query: {
            bool: {
              filter: [
                {
                  term: { 'service.name': 'opbeans' },
                },
                {
                  term: { 'kibana.alert.status': 'active' },
                },
                {
                  term: { 'service.environment': 'testing' },
                },
              ],
            },
          },
          showExpandToDetails: false,
        },
        {}
      );
    });
  });

  it('should call alerts table with recovered filter', async () => {
    const { getByTestId } = render(<AlertsOverview />, renderOptions);

    await act(async () => {
      const inputEl = getByTestId('recovered');
      inputEl.click();
    });

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenLastCalledWith(
        {
          alertsTableConfigurationRegistry: '',
          id: 'service-overview-alerts',
          configurationId: 'observability',
          featureIds: ['apm'],
          query: {
            bool: {
              filter: [
                {
                  term: { 'service.name': 'opbeans' },
                },
                {
                  term: { 'kibana.alert.status': 'recovered' },
                },
                {
                  term: { 'service.environment': 'testing' },
                },
              ],
            },
          },
          showExpandToDetails: false,
        },
        {}
      );
    });
  });
});
