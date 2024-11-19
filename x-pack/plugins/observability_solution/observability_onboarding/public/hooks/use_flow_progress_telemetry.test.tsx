/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFlowProgressTelemetry } from './use_flow_progress_telemetry';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      ...jest.requireActual('./use_kibana'),
      services: {
        analytics: { reportEvent: jest.fn() },
      },
    }),
  };
});

describe('useFlowProgressTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not trigger an event if there is no progress', () => {
    const render = renderHook(() => ({
      analytics: useKibana().services.analytics,
      flowProgress: useFlowProgressTelemetry(undefined, 'test-flow'),
    }));

    expect(render.result.current.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('triggers an event when there is a progress change', () => {
    const render = renderHook(() => ({
      analytics: useKibana().services.analytics,
      flowProgress: useFlowProgressTelemetry(
        { 'ea-download': { status: 'complete' } },
        'test-flow'
      ),
    }));

    expect(render.result.current.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(render.result.current.analytics.reportEvent).toHaveBeenCalledWith(
      'observability_onboarding',
      {
        uses_legacy_onboarding_page: false,
        flow: 'test-flow',
        step: 'ea-download',
        step_status: 'complete',
      }
    );
  });

  it('does not trigger an event for unsupported steps', () => {
    const render = renderHook(() => ({
      analytics: useKibana().services.analytics,
      flowProgress: useFlowProgressTelemetry({ 'ea-extract': { status: 'complete' } }, 'test-flow'),
    }));

    expect(render.result.current.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not trigger an event if the status of a step has not changed', () => {
    const render = renderHook(() => ({
      analytics: useKibana().services.analytics,
      flowProgress: useFlowProgressTelemetry(
        { 'ea-download': { status: 'complete' } },
        'test-flow'
      ),
    }));

    render.rerender();

    expect(render.result.current.analytics.reportEvent).toHaveBeenCalledTimes(1);
  });
});
