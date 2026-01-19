/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapOtelToSpanLink } from './utils';

describe('span links utils', () => {
  describe('mapOtelToSpanLink', () => {
    it('should map otel span links', () => {
      const otelSpanLinks = {
        span_id: ['span1', 'span2'],
        trace_id: ['trace1', 'trace2'],
      };

      const result = mapOtelToSpanLink(otelSpanLinks);

      expect(result).toEqual([
        { span: { id: 'span1' }, trace: { id: 'trace1' } },
        { span: { id: 'span2' }, trace: { id: 'trace2' } },
      ]);
    });

    it('should skip incomplete span links when either span_id or trace_id is missing', () => {
      const otelSpanLinks = {
        span_id: ['span1', 'span2'],
        trace_id: ['trace1'],
      };

      const result = mapOtelToSpanLink(otelSpanLinks);

      expect(result).toEqual([{ span: { id: 'span1' }, trace: { id: 'trace1' } }]);
    });

    it('should return an empty array if both span_id and trace_id are empty', () => {
      const otelSpanLinks = {
        span_id: [],
        trace_id: [],
      };

      const result = mapOtelToSpanLink(otelSpanLinks);

      expect(result).toEqual([]);
    });

    it('should return correct mapping even if one span_id has more items than the trace_id', () => {
      const otelSpanLinks = {
        span_id: ['span1', 'span2', 'span3'],
        trace_id: ['trace1', 'trace2'],
      };

      const result = mapOtelToSpanLink(otelSpanLinks);

      expect(result).toEqual([
        { span: { id: 'span1' }, trace: { id: 'trace1' } },
        { span: { id: 'span2' }, trace: { id: 'trace2' } },
      ]);
    });
  });
});
