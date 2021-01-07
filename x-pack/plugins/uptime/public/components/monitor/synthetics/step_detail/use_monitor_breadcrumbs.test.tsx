/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import React from 'react';
import { Route } from 'react-router-dom';
import { of } from 'rxjs';
import { MountWithReduxProvider, mountWithRouter } from '../../../../lib';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { useMonitorBreadcrumb } from './use_monitor_breadcrumb';
import { OVERVIEW_ROUTE } from '../../../../../common/constants';
import { Ping } from '../../../../../common/runtime_types/ping';
import { JourneyState } from '../../../../state/reducers/journey';

describe('useMonitorBreadcrumbs', () => {
  it('sets the given breadcrumbs', () => {
    const [getBreadcrumbs, core] = mockCore();

    const Component = () => {
      useMonitorBreadcrumb({
        activeStep: { monitor: { id: 'test-monitor' } } as Ping,
        journey: { details: { timestamp: '2021-01-04T11:25:19.104Z' } } as JourneyState,
      });
      return <>Step Water Fall</>;
    };

    mountWithRouter(
      <MountWithReduxProvider>
        <KibanaContextProvider services={{ ...core }}>
          <Route path={OVERVIEW_ROUTE}>
            <Component />
          </Route>
        </KibanaContextProvider>
      </MountWithReduxProvider>
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

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const get = () => {
    return breadcrumbObj;
  };
  const core = {
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
    uiSettings: {
      get: (key: string) => 'MMM D, YYYY @ HH:mm:ss.SSS',
      get$: (key: string) => of('MMM D, YYYY @ HH:mm:ss.SSS'),
    },
  };

  return [get, core];
};
