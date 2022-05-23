/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsAppState } from '../../../state/root_reducer';

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
      },
    ],
    loading: false,
    error: null,
  },
  monitorList: {
    data: {
      total: 0,
      monitors: [],
      perPage: 0,
      page: 0,
      syncErrors: [],
    },
    error: null,
    loading: false,
  },
};

// TODO: Complete mock state
