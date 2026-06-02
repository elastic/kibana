/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';
import {
  fetchRootSpanByTraceId,
  FETCH_TRACE_ROOT_SPAN_OPERATION_ID,
} from './fetch_trace_root_span_by_trace_id';
import * as createCallApmApi from './create_call_apm_api';

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const signal = new AbortController().signal;

describe('fetchRootSpanByTraceId', () => {
  const callApmApiSpy = jest.spyOn(createCallApmApi, 'callApmApi');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures APM error with kibana_meta_operation_id label and re-throws when callApmApi fails', async () => {
    const error = new Error('boom');
    callApmApiSpy.mockRejectedValueOnce(error);

    await expect(
      fetchRootSpanByTraceId({ traceId: 'trace-1', start: 'from', end: 'to' }, signal)
    ).rejects.toThrow('boom');

    expect(apm.captureError).toHaveBeenCalledWith(error, {
      labels: { kibana_meta_operation_id: FETCH_TRACE_ROOT_SPAN_OPERATION_ID },
    });
  });

  it('does not capture AbortError as a RUM event but still re-throws it', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    callApmApiSpy.mockRejectedValueOnce(abortError);

    await expect(
      fetchRootSpanByTraceId({ traceId: 'trace-1', start: 'from', end: 'to' }, signal)
    ).rejects.toThrow('aborted');

    expect(apm.captureError).not.toHaveBeenCalled();
  });
});
