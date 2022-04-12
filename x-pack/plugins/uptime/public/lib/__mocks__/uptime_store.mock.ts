/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { DEFAULT_THROTTLING } from '../../../common/runtime_types';
import { AppState } from '../../state';

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
export const mockState: AppState = {
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
    refreshedMonitorIds: [],
  },
  monitorManagementList: {
    throttling: DEFAULT_THROTTLING,
    list: {
      page: 1,
      perPage: 10,
      total: null,
      monitors: [],
      syncErrors: null,
    },
    locations: [],
    loading: {
      monitorList: false,
      serviceLocations: false,
      enablement: false,
    },
    error: {
      monitorList: null,
      serviceLocations: null,
      enablement: null,
    },
    enablement: null,
    syntheticsService: {
      loading: false,
      signupUrl: null,
    },
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
    anomalyAlertDeletion: { data: null, loading: false },
    alerts: { data: null, loading: false },
    connectors: { data: null, loading: false },
    newAlert: { data: null, loading: false },
  },
  journeys: {},
  networkEvents: {},
  synthetics: {
    blocks: {},
    cacheSize: 0,
    hitCount: [],
  },
  testNowRuns: {
    testNowRuns: [],
  },
};
