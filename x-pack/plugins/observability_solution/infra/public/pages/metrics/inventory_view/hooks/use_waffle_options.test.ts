/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useWaffleOptions, WaffleOptionsState } from './use_waffle_options';

// Mock useUrlState hook
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: '',
    replace: () => {},
  }),
}));

// Jest can't access variables outside the scope of the mock factory function except to
// reassign them, so we can't make these both part of the same object
let PREFILL_NODETYPE: WaffleOptionsState['nodeType'] | undefined;
let PREFILL_METRIC: WaffleOptionsState['metric'] | undefined;
let PREFILL_CUSTOM_METRICS: WaffleOptionsState['customMetrics'] | undefined;
let PREFILL_ACCOUNT_ID: WaffleOptionsState['accountId'] | undefined;
let PREFILL_REGION: WaffleOptionsState['region'] | undefined;
jest.mock('../../../../alerting/use_alert_prefill', () => ({
  useAlertPrefillContext: () => ({
    inventoryPrefill: {
      setNodeType(nodeType: WaffleOptionsState['nodeType']) {
        PREFILL_NODETYPE = nodeType;
      },
      setMetric(metric: WaffleOptionsState['metric']) {
        PREFILL_METRIC = metric;
      },
      setCustomMetrics(customMetrics: WaffleOptionsState['customMetrics']) {
        PREFILL_CUSTOM_METRICS = customMetrics;
      },
      setAccountId(accountId: WaffleOptionsState['accountId']) {
        PREFILL_ACCOUNT_ID = accountId;
      },
      setRegion(region: WaffleOptionsState['region']) {
        PREFILL_REGION = region;
      },
    },
  }),
}));

const renderUseWaffleOptionsHook = () => renderHook(() => useWaffleOptions());

describe('useWaffleOptions', () => {
  beforeEach(() => {
    PREFILL_NODETYPE = undefined;
    PREFILL_METRIC = undefined;
    PREFILL_CUSTOM_METRICS = undefined;
    PREFILL_ACCOUNT_ID = undefined;
    PREFILL_REGION = undefined;
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleOptionsHook();

    const newOptions = {
      nodeType: 'pod',
      metric: { type: 'memory' },
      customMetrics: [
        {
          type: 'custom',
          id: "i don't want to bother to copy and paste an actual uuid so instead i'm going to smash my keyboard skjdghsjodkyjheurvjnsgn",
          aggregation: 'avg',
          field: 'hey.system.are.you.good',
        },
      ],
      accountId: '123456789012',
      region: 'us-east-1',
    } as WaffleOptionsState;
    act(() => {
      result.current.changeNodeType(newOptions.nodeType);
    });
    rerender();
    expect(PREFILL_NODETYPE).toEqual(newOptions.nodeType);
    act(() => {
      result.current.changeMetric(newOptions.metric);
    });
    rerender();
    expect(PREFILL_METRIC).toEqual(newOptions.metric);
    act(() => {
      result.current.changeCustomMetrics(newOptions.customMetrics);
    });
    rerender();
    expect(PREFILL_CUSTOM_METRICS).toEqual(newOptions.customMetrics);
    act(() => {
      result.current.changeAccount(newOptions.accountId);
    });
    rerender();
    expect(PREFILL_ACCOUNT_ID).toEqual(newOptions.accountId);
    act(() => {
      result.current.changeRegion(newOptions.region);
    });
    rerender();
    expect(PREFILL_REGION).toEqual(newOptions.region);
  });
});
