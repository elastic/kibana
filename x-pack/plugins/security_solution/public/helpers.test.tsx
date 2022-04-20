/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { Capabilities } from '@kbn/core/public';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../common/constants';
import { mockEcsDataWithAlert } from './common/mock';
import { ALERT_RULE_UUID, ALERT_RULE_NAME, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import {
  parseRoute,
  isSubPluginAvailable,
  getSubPluginRoutesByCapabilities,
  RedirectRoute,
  getField,
} from './helpers';
import { StartedSubPlugins } from './types';

describe('public helpers parseRoute', () => {
  it('should properly parse hash route', () => {
    const hashSearch =
      '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))';
    const hashLocation = {
      hash: `#/detections/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${hashSearch}`,
      pathname: '/app/siem',
      search: '',
    };

    expect(parseRoute(hashLocation)).toEqual({
      pageName: 'detections',
      path: `/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${hashSearch}`,
      search: hashSearch,
    });
  });

  it('should properly parse non-hash route', () => {
    const nonHashLocation = {
      hash: '',
      pathname: '/app/security/detections/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit',
      search:
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))',
    };

    expect(parseRoute(nonHashLocation)).toEqual({
      pageName: 'detections',
      path: `/rules/id/78acc090-bbaa-4a86-916b-ea44784324ae/edit${nonHashLocation.search}`,
      search: nonHashLocation.search,
    });
  });

  it('should properly parse non-hash subplugin route', () => {
    const nonHashLocation = {
      hash: '',
      pathname: '/app/security/detections',
      search:
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)),timeline:(linkTo:!(global),timerange:(from:%272020-09-06T11:43:55.814Z%27,fromStr:now-24h,kind:relative,to:%272020-09-07T11:43:55.814Z%27,toStr:now)))',
    };

    expect(parseRoute(nonHashLocation)).toEqual({
      pageName: 'detections',
      path: `${nonHashLocation.search}`,
      search: nonHashLocation.search,
    });
  });
});

describe('#getSubPluginRoutesByCapabilities', () => {
  const mockRender = () => null;
  const mockSubPlugins = {
    alerts: { routes: [{ path: 'alerts', render: mockRender }] },
    cases: { routes: [{ path: 'cases', render: mockRender }] },
  } as unknown as StartedSubPlugins;
  it('cases routes should return NoPrivilegesPage component when cases plugin is NOT available ', () => {
    const routes = getSubPluginRoutesByCapabilities(mockSubPlugins, {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
    } as unknown as Capabilities);
    const casesRoute = routes.find((r) => r.path === 'cases');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CasesView = (casesRoute?.component ?? mockRender) as React.ComponentType<any>;
    expect(shallow(<CasesView />)).toMatchInlineSnapshot(`
      <NoPrivilegePage
        subPluginKey="cases"
      />
    `);
  });

  it('alerts should return NoPrivilegesPage component when siem plugin is NOT available ', () => {
    const routes = getSubPluginRoutesByCapabilities(mockSubPlugins, {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
    } as unknown as Capabilities);
    const alertsRoute = routes.find((r) => r.path === 'alerts');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AlertsView = (alertsRoute?.component ?? mockRender) as React.ComponentType<any>;
    expect(shallow(<AlertsView />)).toMatchInlineSnapshot(`
      <NoPrivilegePage
        subPluginKey="alerts"
      />
    `);
  });

  it('should return NoPrivilegesPage for each route when both plugins are NOT available ', () => {
    const routes = getSubPluginRoutesByCapabilities(mockSubPlugins, {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
    } as unknown as Capabilities);
    const casesRoute = routes.find((r) => r.path === 'cases');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CasesView = (casesRoute?.component ?? mockRender) as React.ComponentType<any>;

    const alertsRoute = routes.find((r) => r.path === 'alerts');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AlertsView = (alertsRoute?.component ?? mockRender) as React.ComponentType<any>;

    expect(shallow(<AlertsView />)).toMatchInlineSnapshot(`
      <NoPrivilegePage
        subPluginKey="alerts"
      />
    `);
    expect(shallow(<CasesView />)).toMatchInlineSnapshot(`
      <NoPrivilegePage
        subPluginKey="cases"
      />
    `);
  });
});

describe('#isSubPluginAvailable', () => {
  it('plugin outsides of cases should be available if siem privilege is all and independently of cases privileges', () => {
    expect(
      isSubPluginAvailable('pluginKey', {
        [SERVER_APP_ID]: { show: true, crud: true },
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities)
    ).toBeTruthy();
  });

  it('plugin outsides of cases should be available if siem privilege is read and independently of cases privileges', () => {
    expect(
      isSubPluginAvailable('pluginKey', {
        [SERVER_APP_ID]: { show: true, crud: false },
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities)
    ).toBeTruthy();
  });

  it('plugin outsides of cases should NOT be available if siem privilege is none and independently of cases privileges', () => {
    expect(
      isSubPluginAvailable('pluginKey', {
        [SERVER_APP_ID]: { show: false, crud: false },
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities)
    ).toBeFalsy();
  });

  it('cases plugin should be available if cases privilege is all and independently of siem privileges', () => {
    expect(
      isSubPluginAvailable('cases', {
        [SERVER_APP_ID]: { show: false, crud: false },
        [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
      } as unknown as Capabilities)
    ).toBeTruthy();
  });

  it('cases plugin should be available if cases privilege is read and independently of siem privileges', () => {
    expect(
      isSubPluginAvailable('cases', {
        [SERVER_APP_ID]: { show: false, crud: false },
        [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
      } as unknown as Capabilities)
    ).toBeTruthy();
  });

  it('cases plugin should NOT be available if cases privilege is none independently of siem privileges', () => {
    expect(
      isSubPluginAvailable('pluginKey', {
        [SERVER_APP_ID]: { show: false, crud: false },
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities)
    ).toBeFalsy();
  });
});

describe('RedirectRoute', () => {
  it('RedirectRoute should redirect to overview page when siem and case privileges are all', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: true, crud: true },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/get_started"
      />
    `);
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are read', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/get_started"
      />
    `);
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are off', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/get_started"
      />
    `);
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is all', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/get_started"
      />
    `);
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is read', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/get_started"
      />
    `);
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is read', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/cases"
      />
    `);
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is all', () => {
    const mockCapabilitities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
    } as unknown as Capabilities;
    expect(shallow(<RedirectRoute capabilities={mockCapabilitities} />)).toMatchInlineSnapshot(`
      <Redirect
        to="/cases"
      />
    `);
  });
});

describe('public helpers getField', () => {
  it('should return the same value for signal.rule fields as for kibana.alert.rule fields', () => {
    const signalRuleName = getField(mockEcsDataWithAlert, 'signal.rule.name');
    const aadRuleName = getField(mockEcsDataWithAlert, ALERT_RULE_NAME);
    const aadRuleId = getField(mockEcsDataWithAlert, ALERT_RULE_UUID);
    const signalRuleId = getField(mockEcsDataWithAlert, 'signal.rule.id');
    expect(signalRuleName).toEqual(aadRuleName);
    expect(signalRuleId).toEqual(aadRuleId);
  });

  it('should handle flattened rule parameters correctly', () => {
    const mockAlertWithParameters = {
      ...mockEcsDataWithAlert,
      'kibana.alert.rule.parameters': {
        description: '24/7',
        risk_score: '21',
        severity: 'low',
        timeline_id: '1234-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Untitled timeline',
        meta: {
          from: '1000m',
          kibana_siem_app_url: 'https://localhost:5601/app/security',
        },
        author: [],
        false_positives: [],
        from: 'now-300s',
        rule_id: 'b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea',
        max_signals: 100,
        risk_score_mapping: [],
        severity_mapping: [],
        threat: [],
        to: 'now',
        references: ['www.test.co'],
        version: '1',
        exceptions_list: [],
        immutable: false,
        type: 'query',
        language: 'kuery',
        index: ['auditbeat-*'],
        query: 'user.name: root or user.name: admin',
        filters: [],
      },
    };
    const signalQuery = getField(mockAlertWithParameters, 'signal.rule.query');
    const aadQuery = getField(mockAlertWithParameters, `${ALERT_RULE_PARAMETERS}.query`);
    expect(signalQuery).toEqual(aadQuery);
  });
});
