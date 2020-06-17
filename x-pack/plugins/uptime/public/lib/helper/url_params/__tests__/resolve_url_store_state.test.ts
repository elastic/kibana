/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveUrlUpdates, resolveStateChanges } from '../resolve_url_store_state';
import { UptimeUrlParams } from '../get_supported_url_params';
import { UiState } from '../../../../state/reducers/ui';

describe('resolve url store state', () => {
  let urlParams: UptimeUrlParams;
  let uiState: UiState;

  beforeEach(() => {
    urlParams = {
      autorefreshInterval: 50000,
      autorefreshIsPaused: true,
      dateRangeStart: 'now-10m',
      dateRangeEnd: 'now-1m',
      filters: '',
      search: '',
      statusFilter: '',
    };

    uiState = {
      alertFlyoutVisible: false,
      autorefreshInterval: 60000,
      autorefreshIsPaused: false,
      basePath: '',
      currentMonitorListPage: 'pagination',
      dateRange: {
        from: 'now-15m',
        to: 'now',
      },
      esKuery: '',
      searchText: 'monitor.id: monitor-foo',
      selectedFilters: '[["url.port", [5601, 9200]]]',
      statusFilter: 'up',
      integrationsPopoverOpen: null,
    };
  });

  describe('resolveUrlUpdates', () => {
    it('sets url values', () => {
      expect(resolveUrlUpdates(urlParams, uiState)).toMatchInlineSnapshot(`
        Object {
          "autorefreshInterval": 60000,
          "autorefreshIsPaused": false,
          "dateRangeEnd": "now",
          "dateRangeStart": "now-15m",
          "filters": "[[\\"url.port\\", [5601, 9200]]]",
          "pagination": "pagination",
          "search": "monitor.id: monitor-foo",
          "statusFilter": "up",
        }
      `);
    });
  });

  describe('resolveStateChanges', () => {
    it('sets store values', () => {
      urlParams = {
        autorefreshInterval: 1212,
        autorefreshIsPaused: false,
        dateRangeStart: 'now-34h',
        dateRangeEnd: 'now-2h',
        filters: '[["observer.geo.name", ["fairbanks"]]]',
        pagination: 'a page',
        search: 'monitor.id: a-new-id',
        statusFilter: 'down',
      };
      uiState.autorefreshIsPaused = true;
      expect(resolveStateChanges(urlParams, uiState)).toMatchInlineSnapshot(`
        Object {
          "autorefreshInterval": 1212,
          "autorefreshIsPaused": false,
          "currentMonitorListPage": "a page",
          "dateRange": Object {
            "from": "now-34h",
            "to": "now-2h",
          },
          "searchText": "monitor.id: a-new-id",
          "selectedFilters": "[[\\"observer.geo.name\\", [\\"fairbanks\\"]]]",
          "statusFilter": "down",
        }
      `);
    });
  });
});
