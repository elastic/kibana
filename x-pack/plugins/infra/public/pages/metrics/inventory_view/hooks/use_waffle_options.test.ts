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
jest.mock('../../../../alerting/use_alert_prefill', () => ({
  useAlertPrefillContext: () => ({
    inventoryPrefill: {
      setNodeType(nodeType: WaffleOptionsState['nodeType']) {
        PREFILL_NODETYPE = nodeType;
      },
      setMetric(metric: WaffleOptionsState['metric']) {
        PREFILL_METRIC = metric;
      },
    },
  }),
}));

const renderUseWaffleOptionsHook = () => renderHook(() => useWaffleOptions());

describe('useWaffleOptions', () => {
  beforeEach(() => {
    PREFILL_NODETYPE = undefined;
    PREFILL_METRIC = undefined;
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleOptionsHook();

    const newOptions = {
      nodeType: 'pod',
      metric: { type: 'memory' },
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
  });
});
