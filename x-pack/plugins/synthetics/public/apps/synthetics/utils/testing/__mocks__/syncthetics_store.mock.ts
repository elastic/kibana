/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppState } from '../../../state';

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
export const mockState: AppState = {
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
};

// TODO: Complete mock state
