/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EnableMonitorAlert } from './enable_alert';
import {
  mountWithRouterRedux,
  renderWithRouterRedux,
  shallowWithRouterRedux,
} from '../../../../lib';
import { EuiPopover, EuiText } from '@elastic/eui';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';
import { ReactRouterEuiLink } from '../../../common/react_router_helpers';
import { mockStateForSelector } from '../../../../lib/helper/test_helpers';
import { mockState } from '../../../../lib/__mocks__/uptime_store.mock';

describe('EnableAlertComponent', () => {
  let defaultConnectors: string[] = [];
  const alerts: any = [];
  const defaultState = {
    alerts: {
      ...mockState.alerts,
      alerts: {
        data: alerts,
        loading: false,
      },
    },
    dynamicSettings: {
      loading: false,
      settings: Object.assign(DYNAMIC_SETTINGS_DEFAULTS, { defaultConnectors }),
    },
  };

  beforeEach(() => {
    mockStateForSelector(defaultState);
  });

  it('shallow renders without errors for valid props', () => {
    const wrapper = shallowWithRouterRedux(
      <EnableMonitorAlert monitorId={'testMonitor'} monitorName={'My website'} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors for valid props', () => {
    const wrapper = renderWithRouterRedux(
      <EnableMonitorAlert monitorId={'testMonitor'} monitorName={'My website'} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('displays define connectors when there is none', () => {
    defaultConnectors = [];
    const wrapper = mountWithRouterRedux(
      <EnableMonitorAlert monitorId={'testMonitor'} monitorName={'My website'} />
    );
    expect(wrapper.find(EuiPopover)).toHaveLength(1);
    wrapper.find('button').simulate('click');
    expect(wrapper.find(EuiText).text()).toBe(
      'To start enabling alerts, please define a default alert action connector in Settings'
    );
    expect(wrapper.find(ReactRouterEuiLink)).toMatchInlineSnapshot(`
      <ReactRouterEuiLink
        data-test-subj="uptimeSettingsLink"
        to="/settings?focusConnectorField=true"
      >
        <ReactRouterHelperForEui
          to="/settings?focusConnectorField=true"
        >
          <EuiLink
            data-test-subj="uptimeSettingsLink"
            href="/settings?focusConnectorField=true"
            onClick={[Function]}
          >
            <a
              className="euiLink euiLink--primary"
              data-test-subj="uptimeSettingsLink"
              href="/settings?focusConnectorField=true"
              onClick={[Function]}
              rel="noreferrer"
            >
              Settings
            </a>
          </EuiLink>
        </ReactRouterHelperForEui>
      </ReactRouterEuiLink>
    `);
  });

  it('does not displays define connectors when there is connector', () => {
    mockStateForSelector({
      dynamicSettings: {
        loading: false,
        settings: Object.assign(DYNAMIC_SETTINGS_DEFAULTS, {
          defaultConnectors: ['infra-slack-connector-id'],
        }),
      },
    });
    const wrapper = mountWithRouterRedux(
      <EnableMonitorAlert monitorId={'testMonitor'} monitorName={'My website'} />
    );

    expect(wrapper.find(EuiPopover)).toHaveLength(0);
  });

  it('displays disable when alert is there', () => {
    const data: any = [{ id: 'test-alert', params: { search: 'testMonitor' } }];
    mockStateForSelector({
      ...defaultState,
      alerts: {
        ...defaultState.alerts,
        alerts: {
          data: {
            data,
            page: 0,
            perPage: 1,
            total: 1,
          },
          loading: false,
        },
      },
    });

    const wrapper = mountWithRouterRedux(
      <EnableMonitorAlert monitorId={'testMonitor'} monitorName={'My website'} />
    );

    expect(wrapper.find('button').prop('aria-label')).toBe('Disable status alert');
  });
});
