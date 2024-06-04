/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AppContextTestRender } from '../../mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../mock/endpoint';

describe('When using `useAlertResponseActionsSupport()` hook', () => {
  let alertDetailItemData: TimelineEventsDetailsItem[];
  let renderHook: AppContextTestRender['renderHook'];

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    // Enable feature flags by default
    appContextMock.setExperimentalFlag({
      responseActionsSentinelOneV1Enabled: true,
      responseActionsSentinelOneGetFileEnabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    });

    renderHook = appContextMock.renderHook;
    alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();
  });

  // TODO:PT Loop through all conditions
  it.todo('should return expected response for agentType `%s`');

  // TODO:PT Loop through all conditions
  it.todo('should set `isSupported` to false for: %s');
});
