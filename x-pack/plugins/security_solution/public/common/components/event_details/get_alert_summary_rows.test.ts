/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseSummaryRowsProps } from './get_alert_summary_rows';
import { useSummaryRows } from './get_alert_summary_rows';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../mock/endpoint';
import type { RenderHookResult } from '@testing-library/react-hooks/src/types';
import type { AlertSummaryRow } from './helpers';

describe('useSummaryRows', () => {
  let hookProps: UseSummaryRowsProps;
  let renderHook: () => RenderHookResult<UseSummaryRowsProps, AlertSummaryRow[]>;

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    appContextMock.setExperimentalFlag({
      responseActionsSentinelOneV1Enabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
    });

    hookProps = {
      data: endpointAlertDataMock.generateEndpointAlertDetailsItemData(),
      browserFields: {},
      scopeId: 'scope-id',
      eventId: 'event-id',
      investigationFields: [],
    };

    renderHook = () => {
      return appContextMock.renderHook<UseSummaryRowsProps, AlertSummaryRow[]>(() =>
        useSummaryRows(hookProps)
      );
    };
  });

  it('returns summary rows for default event categories', () => {
    const { result } = renderHook();

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'host.name', description: expect.anything() }),
      ])
    );
  });

  it('excludes fields not related to the event source', () => {
    const { result } = renderHook();

    expect(result.current).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'agent.id',
          description: expect.anything(),
        }),
      ])
    );
  });

  it('includes sentinel_one agent status field', () => {
    hookProps.data = endpointAlertDataMock.generateSentinelOneAlertDetailsItemData();
    const { result } = renderHook();

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Agent status',
          description: expect.objectContaining({
            values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
          }),
        }),
      ])
    );
  });

  it('includes crowdstrike agent status field', () => {
    hookProps.data = endpointAlertDataMock.generateCrowdStrikeAlertDetailsItemData();
    const { result } = renderHook();

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Agent status',
          description: expect.objectContaining({
            values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
          }),
        }),
      ])
    );
  });
});
