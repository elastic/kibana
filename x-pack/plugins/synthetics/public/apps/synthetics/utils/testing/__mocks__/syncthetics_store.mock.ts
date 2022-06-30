/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsAppState } from '../../../state/root_reducer';
import {
  ConfigKey,
  DEFAULT_THROTTLING,
  LocationStatus,
} from '../../../../../../common/runtime_types';

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
export const mockState: SyntheticsAppState = {
  ui: {
    alertFlyoutVisible: false,
    basePath: 'yyz',
    esKuery: '',
    integrationsPopoverOpen: null,
    searchText: '',
    monitorId: '',
  },
  indexStatus: {
    data: null,
    error: null,
    loading: false,
  },
  serviceLocations: {
    throttling: DEFAULT_THROTTLING,
    locations: [
      {
        id: 'us_central',
        label: 'US Central',
        geo: {
          lat: 41.25,
          lon: -95.86,
        },
        url: 'https://test.elastic.dev',
        isServiceManaged: true,
        status: LocationStatus.GA,
      },
      {
        id: 'us_east',
        label: 'US East',
        geo: {
          lat: 41.25,
          lon: -95.86,
        },
        url: 'https://test.elastic.dev',
        isServiceManaged: true,
        status: LocationStatus.EXPERIMENTAL,
      },
    ],
    loading: false,
    error: null,
  },
  monitorList: {
    pageState: {
      pageIndex: 0,
      pageSize: 10,
      sortOrder: 'asc',
      sortField: `${ConfigKey.NAME}.keyword`,
    },
    data: {
      total: 0,
      monitors: [],
      perPage: 0,
      page: 0,
      syncErrors: [],
      absoluteTotal: 0,
    },
    error: null,
    loading: false,
  },
  syntheticsEnablement: { loading: false, error: null, enablement: null },
  monitorStatus: {
    data: null,
    loading: false,
    error: null,
    selectedLocationId: null,
  },
  syntheticsMonitor: {
    data: null,
    loading: false,
    error: null,
  },
};
