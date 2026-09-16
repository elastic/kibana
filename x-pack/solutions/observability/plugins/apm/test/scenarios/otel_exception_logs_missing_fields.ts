/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reproduces https://github.com/elastic/kibana/issues/290770: unprocessed OTel exception logs
 * in `logs-*` that are missing APM required fields used to make the waterfall return a 500.
 *
 * Use a short range to avoid duplicates:
 *
 *   node scripts/synthtrace otel_exception_logs_missing_fields --from=now-1m --to=now --clean
 *
 * The trace contains:
 * - Root transaction (GET /checkout) with a DB span child
 * - A well formed exception log correlated to the transaction, which should be listed as an error
 * - An exception log without `service.name`, which should be skipped
 * - An exception log without `span.id`, which should be skipped
 *
 * Open the trace waterfall for `synth-otel-exception-logs` and check that it loads. Before the
 * fix, `GET /internal/apm/unified_traces/{traceId}` answered 500 for the whole trace. After it,
 * the malformed documents are skipped and the Kibana server log has a
 * `[get_unprocessed_otel_errors] Skipping document ...` warning for each of them.
 *
 * The logs deliberately go to a generic `logs-synth-default` data stream rather than a
 * `logs-*.otel-*` one: the reported condition is any `logs-*` document that trips the exception
 * filter, and the waterfall reads the configured log sources, so the dataset is irrelevant to the
 * 500. That also means this scenario does not exercise paths keyed on APM's `error` index pattern
 * (`logs-apm*,apm-*,logs-*.otel-*`); adding an OTel data stream variant is tracked separately.
 */

import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const SERVICE_NAME = 'synth-otel-exception-logs';

const scenario: Scenario<ApmFields | LogDocument> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamp = range.to.getTime() - 1000;

      const instance = apm
        .service({ name: SERVICE_NAME, environment: 'production', agentName: 'nodejs' })
        .instance('instance-1');

      const transaction = instance
        .transaction({ transactionName: 'GET /checkout' })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instance
            .span({ spanName: 'SELECT * FROM orders', spanType: 'db', spanSubtype: 'postgresql' })
            .destination('postgresql')
            .timestamp(timestamp + 10)
            .duration(300)
            .success()
        );

      const serializedTransaction = transaction
        .serialize()
        .find((event) => event['processor.event'] === 'transaction');

      const traceId = serializedTransaction!['trace.id']!;
      const transactionId = serializedTransaction!['transaction.id']!;

      // An unprocessed OTel exception log: `event_name` and `exception.*` keep their semconv
      // names and `processor.event` is absent, which is what the waterfall looks for.
      const exceptionLog = (exceptionType: string, exceptionMessage: string) =>
        log.create().message(exceptionMessage).logLevel('error').defaults({
          event_name: 'exception',
          'exception.type': exceptionType,
          'exception.message': exceptionMessage,
          'trace.id': traceId,
        });

      const logIterable = range
        .interval('1m')
        .rate(1)
        .generator(() => [
          // Well formed: has service.name and span.id
          exceptionLog('ValidationError', 'Validation failed: missing required field')
            .service(SERVICE_NAME)
            .defaults({ 'span.id': transactionId })
            .timestamp(timestamp + 100),
          // Missing service.name
          exceptionLog('PaymentError', 'Payment gateway timeout')
            .defaults({ 'span.id': transactionId })
            .timestamp(timestamp + 200),
          // Missing span.id
          exceptionLog('QueryTimeoutError', 'Query timeout after 300ms')
            .service(SERVICE_NAME)
            .timestamp(timestamp + 310),
        ]);

      const apmIterable = range
        .interval('1m')
        .rate(1)
        .generator(() => [transaction]);

      return [withClient(apmEsClient, apmIterable), withClient(logsEsClient, logIterable)];
    },
  };
};

export default scenario;
