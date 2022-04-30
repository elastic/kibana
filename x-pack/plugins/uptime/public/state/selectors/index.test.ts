/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBasePath, isIntegrationsPopupOpen } from './index';
import { AppState } from '../../state';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants/settings_defaults';

describe('state selectors', () => {
  const state: AppState = {
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
    ping: {
      pingHistogram: null,
      loading: false,
      errors: [],
    },
    pingList: {
      loading: false,
      pingList: {
        total: 0,
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
      total: 0,
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
    journeys: {},
    networkEvents: {},
    synthetics: {
      blocks: {},
      cacheSize: 0,
      hitCount: [],
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
