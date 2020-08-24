/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBasePath, isIntegrationsPopupOpen } from '../index';
import { AppState } from '../../../state';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('state selectors', () => {
  const state: AppState = {
    overviewFilters: {
      filters: {
        locations: [],
        ports: [],
        schemes: [],
        tags: [],
      },
      errors: [],
      loading: false,
    },
    dynamicSettings: {
      settings: DYNAMIC_SETTINGS_DEFAULTS,
      loading: false,
    },
    monitor: {
      monitorDetailsList: [],
      monitorLocationsList: new Map(),
      loading: false,
      errors: [],
    },
    snapshot: {
      count: {
        up: 2,
        down: 0,
        total: 2,
      },
      errors: [],
      loading: false,
    },
    ui: {
      alertFlyoutVisible: false,
      basePath: 'yyz',
      esKuery: '',
      integrationsPopoverOpen: null,
      searchText: '',
      monitorId: '',
    },
    monitorStatus: {
      status: null,
      loading: false,
    },
    indexPattern: {
      index_pattern: null,
      loading: false,
      errors: [],
    },
    ping: {
      pingHistogram: null,
      loading: false,
      errors: [],
    },
    pingList: {
      loading: false,
      pingList: {
        total: 0,
        locations: [],
        pings: [],
      },
    },
    monitorDuration: {
      durationLines: null,
      loading: false,
      errors: [],
    },
    monitorList: {
      list: {
        prevPagePagination: null,
        nextPagePagination: null,
        summaries: [],
        totalSummaryCount: 0,
      },
      loading: false,
    },
    ml: {
      mlJob: {
        data: null,
        loading: false,
      },
      createJob: { data: null, loading: false },
      deleteJob: { data: null, loading: false },
      mlCapabilities: { data: null, loading: false },
      anomalies: {
        data: null,
        loading: false,
      },
    },
    indexStatus: {
      indexStatus: {
        data: null,
        loading: false,
      },
    },
    certificates: {
      certs: {
        data: null,
        loading: false,
      },
    },
    selectedFilters: null,
    alerts: {
      alertDeletion: { data: null, loading: false },
      anomalyAlert: { data: null, loading: false },
      alerts: { data: null, loading: false },
      connectors: { data: null, loading: false },
      newAlert: { data: null, loading: false },
      anomalyAlertDeletion: { data: null, loading: false },
    },
  };

  it('selects base path from state', () => {
    expect(getBasePath(state)).toBe('yyz');
  });

  it('gets integrations popup state', () => {
    const integrationsPopupOpen = {
      id: 'popup-id',
      open: true,
    };
    state.ui.integrationsPopoverOpen = integrationsPopupOpen;
    expect(isIntegrationsPopupOpen(state)).toBe(integrationsPopupOpen);
  });
});
