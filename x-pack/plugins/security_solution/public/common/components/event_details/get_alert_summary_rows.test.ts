/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertFromEndpointEvent } from '../../utils/endpoint_alert_check';
import {
  isAlertFromSentinelOneEvent,
  SENTINEL_ONE_AGENT_ID_FIELD,
} from '../../utils/sentinelone_alert_check';
import {
  CROWDSTRIKE_AGENT_ID_FIELD,
  isAlertFromCrowdstrikeEvent,
} from '../../utils/crowdstrike_alert_check';
import { renderHook } from '@testing-library/react-hooks';
import { useSummaryRows } from './get_alert_summary_rows';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

jest.mock('../../utils/endpoint_alert_check');
jest.mock('../../utils/sentinelone_alert_check');
jest.mock('../../utils/crowdstrike_alert_check');
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

describe('useSummaryRows', () => {
  const mockData: TimelineEventsDetailsItem[] = [
    {
      category: 'event',
      field: 'event.category',
      originalValue: ['process'],
      values: ['process'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      originalValue: 'rule-uuid',
      values: ['rule-uuid'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.name',
      originalValue: 'test-host',
      values: ['text-host'],
      isObjectArray: false,
    },
  ];

  const mockBrowserFields = {};
  const mockScopeId = 'scope-id';
  const mockEventId = 'event-id';
  const mockInvestigationFields: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    (isAlertFromEndpointEvent as jest.Mock).mockReturnValue(true);
    (isAlertFromCrowdstrikeEvent as jest.Mock).mockReturnValue(false);
  });

  it('returns summary rows for default event categories', () => {
    const { result } = renderHook(() =>
      useSummaryRows({
        data: mockData,
        browserFields: mockBrowserFields,
        scopeId: mockScopeId,
        eventId: mockEventId,
        investigationFields: mockInvestigationFields,
      })
    );

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'host.name', description: expect.anything() }),
      ])
    );
  });

  it('excludes fields not related to the event source', () => {
    (isAlertFromEndpointEvent as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useSummaryRows({
        data: mockData,
        browserFields: mockBrowserFields,
        scopeId: mockScopeId,
        eventId: mockEventId,
        investigationFields: mockInvestigationFields,
      })
    );

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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (isAlertFromSentinelOneEvent as jest.Mock).mockReturnValue(true);

    const sentinelOneData: TimelineEventsDetailsItem[] = [
      ...mockData,
      {
        category: 'host',
        field: SENTINEL_ONE_AGENT_ID_FIELD,
        originalValue: 'sentinelone-agent-id',
        values: ['sentinelone-agent-id'],
        isObjectArray: false,
      },
    ];

    const { result } = renderHook(() =>
      useSummaryRows({
        data: sentinelOneData,
        browserFields: mockBrowserFields,
        scopeId: mockScopeId,
        eventId: mockEventId,
        investigationFields: mockInvestigationFields,
      })
    );

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Agent status',
          description: expect.objectContaining({ values: ['sentinelone-agent-id'] }),
        }),
      ])
    );
  });

  it('includes crowdstrike agent status field', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (isAlertFromCrowdstrikeEvent as jest.Mock).mockReturnValue(true);

    const crowdstrikeData: TimelineEventsDetailsItem[] = [
      ...mockData,
      {
        category: 'host',
        field: CROWDSTRIKE_AGENT_ID_FIELD,
        originalValue: 'crowdstrike-agent-id',
        values: ['crowdstrike-agent-id'],
        isObjectArray: false,
      },
    ];

    const { result } = renderHook(() =>
      useSummaryRows({
        data: crowdstrikeData,
        browserFields: mockBrowserFields,
        scopeId: mockScopeId,
        eventId: mockEventId,
        investigationFields: mockInvestigationFields,
      })
    );

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Agent status',
          description: expect.objectContaining({ values: ['crowdstrike-agent-id'] }),
        }),
      ])
    );
  });
});
