/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITelemetryClient } from './types';

export const createTelemetryClientMock = (): jest.Mocked<ITelemetryClient> => ({
  reportHostEntryClicked: jest.fn(),
  reportHostsViewQuerySubmitted: jest.fn(),
  reportHostFlyoutFilterRemoved: jest.fn(),
  reportHostFlyoutFilterAdded: jest.fn(),
  reportHostsViewTotalHostCountRetrieved: jest.fn(),
  reportAssetDetailsFlyoutViewed: jest.fn(),
  reportAssetDetailsPageViewed: jest.fn(),
  reportPerformanceMetricEvent: jest.fn(),
  reportAssetDashboardLoaded: jest.fn(),
});
