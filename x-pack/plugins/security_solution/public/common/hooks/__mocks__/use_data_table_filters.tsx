/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useDataTableFilters } from '../use_data_table_filters';

export const getUseDataTableFiltersMock = (): jest.Mocked<typeof useDataTableFilters> => () => ({
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  setShowBuildingBlockAlerts: jest.fn(),
  setShowOnlyThreatIndicatorAlerts: jest.fn(),
});
