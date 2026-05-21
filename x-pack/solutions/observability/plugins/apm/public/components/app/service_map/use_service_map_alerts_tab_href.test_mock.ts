/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reusable jest mock for `use_service_map_alerts_tab_href` consumed by graph
 * test files that render `ServiceMapGraph` without a real APM router context.
 * Used inside a `jest.mock(<path>, () => jest.requireActual(<this path>))`
 * factory so all three hook exports are mocked consistently.
 */
export const useServiceMapAlertsTabHref = jest.fn(() => '/app/apm/services/Test%20Service/alerts');
export const useServiceMapAlertsTabNavigate = jest.fn(() => jest.fn());
export const useServiceMapAlertsNavigateFactory = jest.fn(() => () => jest.fn());
