/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  InMemorySpanExporter,
  BasicTracerProvider,
  SimpleSpanProcessor,
  ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { context } from '@opentelemetry/api';
import { LangTracer } from './lang_tracer';
import { lastValueFrom, of, throwError } from 'rxjs';

describe('langTracer', () => {
  const provider = new BasicTracerProvider();
  const memoryExporter = new InMemorySpanExporter();
  provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
  provider.register();

  beforeEach(() => {
    memoryExporter.reset();
  });

  describe('when creating a span against an observable', () => {
    let tracer: LangTracer;

    beforeEach(() => {
      tracer = new LangTracer(context.active());
    });

    it('calls the callback with the created span', async () => {
      const spanCallback = jest.fn().mockImplementation(() => of('my_value'));
      await lastValueFrom(tracer.startActiveSpan('my_span', spanCallback));

      const { span } = spanCallback.mock.calls[0][0] as {
        span: ReadableSpan;
      };

      expect(span.name).toEqual('my_span');

      expect(span.attributes).toEqual({
        'langtrace.sdk.name': '@langtrase/typescript-sdk',
        'langtrace.service.type': 'llm',
        'langtrace.service.version': 'unknown',
        'langtrace.version': '2.1.0',
      });

      // OK
      expect(span.status.code).toBe(1);
    });

    it('returns the observable', async () => {
      const spanCallback = jest.fn().mockImplementation(() => of('my_value'));
      const value = await lastValueFrom(tracer.startActiveSpan('my_span', spanCallback));

      expect(value).toEqual('my_value');
    });

    it('ends the span with an error status code when the observable', async () => {
      const spanCallback = jest
        .fn()
        .mockImplementation(() => throwError(() => new Error('Unexpected error')));

      const errorHandler = jest.fn();

      await lastValueFrom(tracer.startActiveSpan('my_span', spanCallback)).catch(errorHandler);

      const { span } = spanCallback.mock.calls[0][0] as {
        span: ReadableSpan;
      };

      expect(span.status).toEqual({
        // Error
        code: 2,
        message: 'Unexpected error',
      });
    });
  });

  describe('when creating a child span', () => {
    it('sets the first span as the parent of the second span', async () => {
      const tracer = new LangTracer(context.active());

      const value = await lastValueFrom(
        tracer.startActiveSpan('parent', ({ span, tracer: nextTracer }) => {
          return nextTracer.startActiveSpan('child', () => of('my_value'));
        })
      );

      expect(value).toEqual('my_value');

      const mappedSpans = memoryExporter.getFinishedSpans().map((span) => ({
        name: span.name,
        id: span.spanContext().spanId,
        parentId: span.parentSpanId,
      }));

      const parentSpan = mappedSpans.find((span) => span.name === 'parent');
      const childSpan = mappedSpans.find((span) => span.name === 'child');

      expect(parentSpan).not.toBeUndefined();

      expect(childSpan).not.toBeUndefined();

      expect(childSpan?.parentId).toEqual(parentSpan?.id);
    });
  });
});
