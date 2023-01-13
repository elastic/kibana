/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import React from 'react';
import { Route } from 'react-router-dom';
import { of } from 'rxjs';
import { chromeServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { useMonitorBreadcrumb } from './use_monitor_breadcrumb';
import { Ping, SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';
import { render } from '../../../utils/testing';
import { OVERVIEW_ROUTE } from '../../../../../../common/constants';

describe('useMonitorBreadcrumbs', () => {
  it('sets the given breadcrumbs for steps list view', () => {
    let breadcrumbObj: ChromeBreadcrumb[] = [];
    const getBreadcrumbs = () => {
      return breadcrumbObj;
    };

    const core = {
      chrome: {
        ...chromeServiceMock.createStartContract(),
        setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
          breadcrumbObj = newBreadcrumbs;
        },
      },
      uiSettings: {
        ...uiSettingsServiceMock.createSetupContract(),
        get(key: string, defaultOverride?: any): any {
          return `MMM D, YYYY @ HH:mm:ss.SSS` || defaultOverride;
        },
        get$(key: string, defaultOverride?: any): any {
          return of(`MMM D, YYYY @ HH:mm:ss.SSS`) || of(defaultOverride);
        },
      },
    };

    const Component = () => {
      useMonitorBreadcrumb({
        activeStep: { monitor: { id: 'test-monitor', check_group: 'fake-test-group' } } as Ping,
        details: {
          timestamp: '2021-01-04T11:25:19.104Z',
          journey: {
            monitor: { id: 'test-monitor', check_group: 'fake-test-group' },
          },
        } as SyntheticsJourneyApiResponse['details'],
      });
      return <>Step Water Fall</>;
    };

    render(
      <Route path={OVERVIEW_ROUTE}>
        <Component />
      </Route>,
      { core }
    );

    expect(getBreadcrumbs()).toMatchInlineSnapshot(`
      Array [
        Object {
          "href": "",
          "text": "Observability",
        },
        Object {
          "href": "/app/synthetics",
          "onClick": [Function],
          "text": "Synthetics",
        },
        Object {
          "href": "/app/uptime/monitor/dGVzdC1tb25pdG9y",
          "onClick": [Function],
          "text": "test-monitor",
        },
        Object {
          "href": "/app/uptime/journey/fake-test-group/steps",
          "onClick": [Function],
          "text": "Jan 4, 2021 6:25:19 AM",
        },
      ]
    `);
  });

  it('sets the given breadcrumbs for performance breakdown page', () => {
    let breadcrumbObj: ChromeBreadcrumb[] = [];
    const getBreadcrumbs = () => {
      return breadcrumbObj;
    };

    const core = {
      chrome: {
        ...chromeServiceMock.createStartContract(),
        setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
          breadcrumbObj = newBreadcrumbs;
        },
      },
      uiSettings: {
        ...uiSettingsServiceMock.createSetupContract(),
        get(key: string, defaultOverride?: any): any {
          return `MMM D, YYYY @ HH:mm:ss.SSS` || defaultOverride;
        },
        get$(key: string, defaultOverride?: any): any {
          return of(`MMM D, YYYY @ HH:mm:ss.SSS`) || of(defaultOverride);
        },
      },
    };

    const Component = () => {
      useMonitorBreadcrumb({
        activeStep: { monitor: { id: 'test-monitor', check_group: 'fake-test-group' } } as Ping,
        details: {
          timestamp: '2021-01-04T11:25:19.104Z',
          journey: {
            monitor: { id: 'test-monitor', check_group: 'fake-test-group' },
          },
        } as SyntheticsJourneyApiResponse['details'],
        performanceBreakDownView: true,
      });
      return <>Step Water Fall</>;
    };

    render(
      <Route path={OVERVIEW_ROUTE}>
        <Component />
      </Route>,
      { core }
    );

    expect(getBreadcrumbs()).toMatchInlineSnapshot(`
      Array [
        Object {
          "href": "",
          "text": "Observability",
        },
        Object {
          "href": "/app/synthetics",
          "onClick": [Function],
          "text": "Synthetics",
        },
        Object {
          "href": "/app/uptime/monitor/dGVzdC1tb25pdG9y",
          "onClick": [Function],
          "text": "test-monitor",
        },
        Object {
          "href": "/app/uptime/journey/fake-test-group/steps",
          "onClick": [Function],
          "text": "Jan 4, 2021 6:25:19 AM",
        },
        Object {
          "text": "Performance breakdown",
        },
      ]
    `);
  });
});
