/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    },
  }),
}));

const renderUseWaffleOptionsHook = () => renderHook(() => useWaffleOptions());

describe('useWaffleOptions', () => {
  beforeEach(() => {
    PREFILL_NODETYPE = undefined;
    PREFILL_METRIC = undefined;
    PREFILL_CUSTOM_METRICS = undefined;
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleOptionsHook();

    const newOptions = {
      nodeType: 'pod',
      metric: { type: 'memory' },
      customMetrics: [
        {
          type: 'custom',
          id:
            "i don't want to bother to copy and paste an actual uuid so instead i'm going to smash my keyboard skjdghsjodkyjheurvjnsgn",
          aggregation: 'avg',
          field: 'hey.system.are.you.good',
        },
      ],
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
  });
});
