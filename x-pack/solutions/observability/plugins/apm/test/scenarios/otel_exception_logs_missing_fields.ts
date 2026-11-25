/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Covers the complete error-routing matrix for unprocessed OTel exception logs.
 * Issue: https://github.com/elastic/kibana/issues/291510
 *
 * Use a short range to avoid duplicates:
 *
 *   node scripts/synthtrace otel_exception_logs_missing_fields --from=now-1m --to=now --clean
 *
 * Four services, each with its own trace:
 *
 * 1. `synth-otel-exception-logs`  (original #290770 repro)
 *    Generic `logs-synth-default` data stream via `log.create()`.
 *    - Well-formed exception log → should produce a badge and open the log flyout.
 *    - Missing `service.name` → skipped; Kibana server log shows a Skipping warning.
 *    - Missing `span.id`      → skipped; same warning.
 *
 * 2. `synth-otel-exception-logs-ds`  (issue #291510 task 4)
 *    `logs-generic.otel-default` data stream via `otelLog.create()` with nested
 *    `attributes['exception.*']`.  Exercises the `logs-*.otel-*` path in the
 *    APM error index pattern.  One log omits `event_name` and is matched only via
 *    `exists exception.type` — this validates the ES|QL link works even when
 *    there is no `event_name` clause.
 *
 * 3. `synth-mixed-errors`
 *    One classic APM error plus two unprocessed OTel exception logs on the *same*
 *    span.  The badge count (3) must match what the Errors table shows (3).
 *    Also includes a classic APM error attached to `transaction.id` only (no
 *    `span.id`) to exercise the `span.id ?? transaction.id` bucket key fix.
 *
 * 4. `synth-classic-errors`
 *    Classic APM errors only — regression guard that badge → Errors page still works.
 */

import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import { apm, log, otelLog } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const scenario: Scenario<ApmFields | LogDocument> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const ts = range.to.getTime() - 1000;

      // ------------------------------------------------------------------ //
      // 1. synth-otel-exception-logs  (the original #290770 repro)
      // ------------------------------------------------------------------ //
      const SERVICE_1 = 'synth-otel-exception-logs';
      const inst1 = apm
        .service({ name: SERVICE_1, environment: 'production', agentName: 'nodejs' })
        .instance('instance-1');

      const tx1 = inst1
        .transaction({ transactionName: 'GET /checkout' })
        .timestamp(ts)
        .duration(1000)
        .success()
        .children(
          inst1
            .span({ spanName: 'SELECT * FROM orders', spanType: 'db', spanSubtype: 'postgresql' })
            .destination('postgresql')
            .timestamp(ts + 10)
            .duration(300)
            .success()
        );

      const s1Doc = tx1.serialize().find((e) => e['processor.event'] === 'transaction');
      const traceId1 = s1Doc!['trace.id']!;
      const transactionId1 = s1Doc!['transaction.id']!;

      const makeExceptionLog1 = (type: string, msg: string) =>
        log.create().message(msg).logLevel('error').defaults({
          event_name: 'exception',
          'exception.type': type,
          'exception.message': msg,
          'trace.id': traceId1,
        });

      const logIterable1 = range
        .interval('1m')
        .rate(1)
        .generator(() => [
          // Well-formed: has service.name and span.id
          makeExceptionLog1('ValidationError', 'Validation failed: missing required field')
            .service(SERVICE_1)
            .defaults({ 'span.id': transactionId1 })
            .timestamp(ts + 100),
          // Missing service.name → server-side skip
          makeExceptionLog1('PaymentError', 'Payment gateway timeout')
            .defaults({ 'span.id': transactionId1 })
            .timestamp(ts + 200),
          // Missing span.id → server-side skip
          makeExceptionLog1('QueryTimeoutError', 'Query timeout after 300ms')
            .service(SERVICE_1)
            .timestamp(ts + 310),
        ]);

      const apmIterable1 = range
        .interval('1m')
        .rate(1)
        .generator(() => [tx1]);

      // ------------------------------------------------------------------ //
      // 2. synth-otel-exception-logs-ds  (logs-*.otel-* data stream)
      // ------------------------------------------------------------------ //
      const SERVICE_2 = 'synth-otel-exception-logs-ds';
      const inst2 = apm
        .service({ name: SERVICE_2, environment: 'production', agentName: 'otlp' })
        .instance('instance-1');

      const tx2 = inst2
        .transaction({ transactionName: 'GET /products' })
        .timestamp(ts)
        .duration(500)
        .success();

      const s2Doc = tx2.serialize().find((e) => e['processor.event'] === 'transaction');
      const traceId2 = s2Doc!['trace.id']!;
      const transactionId2 = s2Doc!['transaction.id']!;

      const logIterable2 = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => [
          // Well-formed OTel log in logs-generic.otel-default with nested attributes
          otelLog
            .create()
            .message('Deadline Exceeded')
            .logLevel('error')
            .timestamp(timestamp)
            .defaults({
              span_id: transactionId2,
              trace_id: traceId2,
              resource: {
                attributes: {
                  'service.name': SERVICE_2,
                  'service.version': '1.0.0',
                  'service.environment': 'production',
                  'telemetry.sdk.language': 'nodejs',
                },
              },
              attributes: {
                'span.id': transactionId2,
                'event.name': 'exception',
                'exception.type': 'GrpcDeadlineExceeded',
                'exception.message': 'Deadline Exceeded',
              },
            }),
          // Same span, but event_name is absent — matched only by exists(exception.type)
          otelLog
            .create()
            .message('Missing field error')
            .logLevel('error')
            .timestamp(timestamp + 150)
            .defaults({
              span_id: transactionId2,
              trace_id: traceId2,
              resource: {
                attributes: {
                  'service.name': SERVICE_2,
                  'telemetry.sdk.language': 'nodejs',
                },
              },
              attributes: {
                'span.id': transactionId2,
                // no 'event.name' / event_name — matched only via exception.type
                'exception.type': 'MissingFieldError',
                'exception.message': 'Required field "orderId" is missing',
              },
            }),
        ]);

      const apmIterable2 = range
        .interval('1m')
        .rate(1)
        .generator(() => [tx2]);

      // ------------------------------------------------------------------ //
      // 3. synth-mixed-errors  (1 APM + 2 OTel on the same span)
      // ------------------------------------------------------------------ //
      const SERVICE_3 = 'synth-mixed-errors';
      const inst3 = apm
        .service({ name: SERVICE_3, environment: 'production', agentName: 'java' })
        .instance('instance-1');

      const tx3 = inst3
        .transaction({ transactionName: 'POST /order' })
        .timestamp(ts)
        .duration(800)
        .failure()
        .errors(
          inst3.error({ message: 'DB connection refused', type: 'DBError' }).timestamp(ts + 50)
        );

      const s3Docs = tx3.serialize();
      const s3TxDoc = s3Docs.find((e) => e['processor.event'] === 'transaction');
      const traceId3 = s3TxDoc!['trace.id']!;
      const transactionId3 = s3TxDoc!['transaction.id']!;

      // Also add a classic APM error attached only to transaction.id (no span.id).
      // This exercises the span.id ?? transaction.id badge-bucket fix from §1.
      const txOnlyError = inst3
        .error({ message: 'Auth token expired', type: 'AuthError' })
        .timestamp(ts + 75);
      txOnlyError.fields['trace.id'] = traceId3;
      txOnlyError.fields['transaction.id'] = transactionId3;
      // Deliberately leave span.id unset.

      const apmIterable3 = range
        .interval('1m')
        .rate(1)
        .generator(() => [tx3, txOnlyError]);

      const otelLogIterable3 = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) =>
          [
            { type: 'ValidationError', msg: 'Missing required field' },
            { type: 'PaymentError', msg: 'Payment gateway timeout' },
          ].map(({ type, msg }) =>
            log
              .create()
              .message(msg)
              .logLevel('error')
              .service(SERVICE_3)
              .defaults({
                event_name: 'exception',
                'exception.type': type,
                'exception.message': msg,
                'trace.id': traceId3,
                'span.id': transactionId3,
              })
              .timestamp(timestamp + 200)
          )
        );

      // ------------------------------------------------------------------ //
      // 4. synth-classic-errors  (classic APM errors only — regression guard)
      // ------------------------------------------------------------------ //
      const SERVICE_4 = 'synth-classic-errors';
      const inst4 = apm
        .service({ name: SERVICE_4, environment: 'production', agentName: 'go' })
        .instance('instance-1');

      const tx4 = inst4
        .transaction({ transactionName: 'GET /items' })
        .timestamp(ts)
        .duration(400)
        .failure()
        .errors(
          inst4.error({ message: 'record not found', type: 'NotFoundError' }).timestamp(ts + 20),
          inst4.error({ message: 'upstream timeout', type: 'TimeoutError' }).timestamp(ts + 40)
        );

      const apmIterable4 = range
        .interval('1m')
        .rate(1)
        .generator(() => [tx4]);

      // ------------------------------------------------------------------ //
      // Wire up clients
      // ------------------------------------------------------------------ //
      return [
        withClient(apmEsClient, apmIterable1),
        withClient(logsEsClient, logIterable1),
        withClient(apmEsClient, apmIterable2),
        withClient(logsEsClient, logIterable2),
        withClient(apmEsClient, apmIterable3),
        withClient(logsEsClient, otelLogIterable3),
        withClient(apmEsClient, apmIterable4),
      ];
    },
  };
};

export default scenario;
