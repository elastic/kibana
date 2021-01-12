/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import React from 'react';
import { Route } from 'react-router-dom';
import { of } from 'rxjs';
import { render } from '../../../../lib/helper/rtl_helpers';
import { useMonitorBreadcrumb } from './use_monitor_breadcrumb';
import { OVERVIEW_ROUTE } from '../../../../../common/constants';
import { Ping } from '../../../../../common/runtime_types/ping';
import { JourneyState } from '../../../../state/reducers/journey';
import { chromeServiceMock, uiSettingsServiceMock } from 'src/core/public/mocks';

describe('useMonitorBreadcrumbs', () => {
  it('sets the given breadcrumbs', () => {
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
        activeStep: { monitor: { id: 'test-monitor' } } as Ping,
        journey: { details: { timestamp: '2021-01-04T11:25:19.104Z' } } as JourneyState,
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
          "href": "/app/uptime",
          "onClick": [Function],
          "text": "Uptime",
        },
        Object {
          "href": "/app/uptime/monitor/dGVzdC1tb25pdG9y",
          "onClick": [Function],
          "text": "test-monitor",
        },
        Object {
          "text": "Jan 4, 2021 @ 06:25:19.104",
        },
      ]
    `);
  });
});
