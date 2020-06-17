/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  setBasePath,
  toggleIntegrationsPopover,
  setAlertFlyoutVisible,
  setSearchTextAction,
} from '../../actions';
import { uiReducer } from '../ui';
import { Action } from 'redux-actions';

describe('ui reducer', () => {
  it(`sets the application's base path`, () => {
    const action = setBasePath('yyz') as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: 'abc',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          autorefreshInterval: 60000,
          autorefreshIsPaused: false,
          dateRange: { from: 'now-15m', to: 'now' },
          statusFilter: '',
          selectedFilters: '',
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('adds integration popover status to state', () => {
    const action = toggleIntegrationsPopover({
      id: 'popover-2',
      open: true,
    }) as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          autorefreshInterval: 60000,
          autorefreshIsPaused: false,
          dateRange: { from: 'now-15m', to: 'now' },
          statusFilter: '',
          selectedFilters: '',
        },
        action
      )
    ).toMatchSnapshot();
  });

  it('updates the alert flyout value', () => {
    const action = setAlertFlyoutVisible(true) as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          autorefreshInterval: 60000,
          autorefreshIsPaused: false,
          dateRange: { from: 'now-15m', to: 'now' },
          statusFilter: '',
          selectedFilters: '',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": true,
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "basePath": "",
        "dateRange": Object {
          "from": "now-15m",
          "to": "now",
        },
        "esKuery": "",
        "integrationsPopoverOpen": null,
        "searchText": "",
        "selectedFilters": "",
        "statusFilter": "",
      }
    `);
  });

  it('sets the search text', () => {
    const action = setSearchTextAction('lorem ipsum') as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          autorefreshInterval: 60000,
          autorefreshIsPaused: false,
          dateRange: { from: 'now-15m', to: 'now' },
          statusFilter: '',
          selectedFilters: '',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": false,
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "basePath": "",
        "dateRange": Object {
          "from": "now-15m",
          "to": "now",
        },
        "esKuery": "",
        "integrationsPopoverOpen": null,
        "searchText": "lorem ipsum",
        "selectedFilters": "",
        "statusFilter": "",
      }
    `);
  });
});
