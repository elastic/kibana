/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EnableMonitorAlert } from './enable_alert';
import { fireEvent } from '@testing-library/react';

import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { makePing } from '../../../../../../common/runtime_types/ping';
import { render } from '../../../../lib/helper/rtl_helpers';
import { DISABLE_STATUS_ALERT, ENABLE_STATUS_ALERT } from './translations';
import { mockState } from '../../../../lib/__mocks__/uptime_store.mock';
import { AlertsResult } from '../../../../state/actions/types';

describe('EnableAlertComponent', () => {
  it('it displays define connectors when there is none', () => {
    const { getByTestId, getByLabelText, getByText, getByRole } = render(
      <EnableMonitorAlert
        monitorId={'testMonitor'}
        selectedMonitor={makePing({ name: 'My website' })}
      />
    );
    expect(getByTestId('uptimeDisplayDefineConnector'));
    expect(getByLabelText(ENABLE_STATUS_ALERT));

    fireEvent.click(getByTestId('uptimeDisplayDefineConnector'));

    expect(getByRole('link', { name: 'Define a default connector' })).toHaveAttribute(
      'href',
      '/settings?focusConnectorField=true'
    );
    expect(getByText(/Define a default connector/));
    expect(getByText(/to receive status alerts./));
  });

  it('does not displays define connectors when there is connector', () => {
    const defaultConnectors = ['infra-slack-connector-id'];

    const { getByTestId, getByLabelText } = render(
      <EnableMonitorAlert
        monitorId={'testMonitor'}
        selectedMonitor={makePing({ name: 'My website' })}
      />,
      {
        state: {
          dynamicSettings: {
            settings: { ...DYNAMIC_SETTINGS_DEFAULTS, defaultConnectors },
            loading: false,
          },
        },
      }
    );

    expect(getByTestId('uptimeEnableSimpleDownAlerttestMonitor'));
    expect(getByLabelText(ENABLE_STATUS_ALERT));
  });

  it('displays disable when alert is there', () => {
    const alerts = [{ id: 'test-alert', params: { search: 'testMonitor' } }];
    const defaultConnectors = ['infra-slack-connector-id'];

    const { getByTestId, getByLabelText } = render(
      <EnableMonitorAlert
        monitorId={'testMonitor'}
        selectedMonitor={makePing({ name: 'My website' })}
      />,
      {
        state: {
          dynamicSettings: {
            settings: { ...DYNAMIC_SETTINGS_DEFAULTS, defaultConnectors },
            loading: false,
          },
          alerts: {
            ...mockState.alerts,
            alerts: {
              data: { data: alerts } as unknown as AlertsResult,
              loading: false,
            },
          },
        },
      }
    );

    expect(getByTestId('uptimeDisableSimpleDownAlerttestMonitor'));
    expect(getByLabelText(DISABLE_STATUS_ALERT));
  });
});
