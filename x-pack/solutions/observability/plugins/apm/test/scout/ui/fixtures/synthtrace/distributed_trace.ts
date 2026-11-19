/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, Serializable, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, httpExitSpan, timerange } from '@kbn/synthtrace-client';
import {
  START_DATE,
  END_DATE,
  PRODUCTION_ENVIRONMENT,
  SERVICE_WATERFALL_RUM,
  SERVICE_WATERFALL_NODE,
  WATERFALL_RUM_TRANSACTION_NAME,
  WATERFALL_NODE_TRANSACTION_NAME,
  WATERFALL_NODE_DB_SPAN_NAME,
} from '../constants';

const WATERFALL_NODE_ERROR_MESSAGE = 'Database query failed';
const WATERFALL_RUM_ERROR_MESSAGE_1 = 'Request timeout';
const WATERFALL_RUM_ERROR_MESSAGE_2 = 'Request failed';

/**
 * Generates a two-level distributed trace for testing the TraceWaterfallFlyout.
 *
 * Structure:
 *   apm-waterfall-rum (root) — 2 errors → "View 2 errors" badge
 *   └── GET /api/products (HTTP exit span)
 *       └── apm-waterfall-node: GET /api/products (child transaction) — 1 error → "View error" badge
 *           └── SELECT * FROM products (DB span)
 *
 * Errors are created manually (not via .errors()) so that span.id is set correctly
 * on each error document. The server's getErrorsByDocId joins errors to waterfall
 * items by errorDoc.span.id, so this field must equal the transaction/span id of
 * the parent item.
 */
export function distributedTrace(): SynthtraceGenerator<ApmFields> {
  const range = timerange(new Date(START_DATE), new Date(END_DATE));

  const rumService = apm
    .service({
      name: SERVICE_WATERFALL_RUM,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'rum-js',
    })
    .instance('rum-instance');

  const nodeService = apm
    .service({
      name: SERVICE_WATERFALL_NODE,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('node-instance');

  // Generate trace events without .errors() — errors are created manually below
  // so that span.id is explicitly set on each error document.
  const traceEvents = Array.from(
    range
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        rumService
          .transaction({ transactionName: WATERFALL_RUM_TRANSACTION_NAME })
          .timestamp(timestamp)
          .duration(500)
          .failure()
          .children(
            rumService
              .span(
                httpExitSpan({
                  spanName: 'GET /api/products',
                  destinationUrl: `http://${SERVICE_WATERFALL_NODE}:3000`,
                })
              )
              .timestamp(timestamp)
              .duration(300)
              .success()
              .children(
                nodeService
                  .transaction({ transactionName: WATERFALL_NODE_TRANSACTION_NAME })
                  .timestamp(timestamp)
                  .duration(250)
                  .failure()
                  .children(
                    nodeService
                      .span({
                        spanName: WATERFALL_NODE_DB_SPAN_NAME,
                        spanType: 'db',
                        spanSubtype: 'postgresql',
                      })
                      .timestamp(timestamp + 50)
                      .duration(100)
                      .success()
                  )
              )
          )
      )
  );

  // Serialize to extract per-trace IDs
  const allFields = traceEvents.flatMap((e) => e.serialize());

  const rumTransactions = allFields.filter(
    (f) =>
      f['processor.event'] === 'transaction' &&
      f['transaction.name'] === WATERFALL_RUM_TRANSACTION_NAME
  );
  const nodeTransactions = allFields.filter(
    (f) =>
      f['processor.event'] === 'transaction' &&
      f['transaction.name'] === WATERFALL_NODE_TRANSACTION_NAME
  );

  const createError = (
    service: ReturnType<ReturnType<typeof apm.service>['instance']>,
    message: string,
    transactionDoc: ApmFields
  ): ApmFields => {
    const transactionId = transactionDoc['transaction.id'] as string;
    const timestampMs = (transactionDoc['timestamp.us'] as number) / 1000;

    const error = service.error({ message });
    error.fields['trace.id'] = transactionDoc['trace.id'];
    error.fields['transaction.id'] = transactionId;
    error.fields['transaction.name'] = transactionDoc['transaction.name'];
    error.fields['transaction.type'] = transactionDoc['transaction.type'];
    error.fields['parent.id'] = transactionId;
    // span.id must equal the transaction/span id so the server's getErrorsByDocId
    // can group this error onto the correct waterfall item
    error.fields['span.id'] = transactionId;
    return error.timestamp(timestampMs).serialize()[0];
  };

  const errorDocs: ApmFields[] = [
    ...nodeTransactions.map((transaction) =>
      createError(nodeService, WATERFALL_NODE_ERROR_MESSAGE, transaction)
    ),
    ...rumTransactions.flatMap((transaction) => [
      createError(rumService, WATERFALL_RUM_ERROR_MESSAGE_1, transaction),
      createError(rumService, WATERFALL_RUM_ERROR_MESSAGE_2, transaction),
    ]),
  ];

  const wrapEvents = (events: Array<Serializable<ApmFields>>): Array<Serializable<ApmFields>> =>
    events
      .flatMap((e) => e.serialize())
      .map((fields) => ({ fields, serialize: () => [fields] } as Serializable<ApmFields>));

  const wrapFields = (fields: ApmFields[]): Array<Serializable<ApmFields>> =>
    fields.map((f) => ({ fields: f, serialize: () => [f] } as Serializable<ApmFields>));

  const allEvents = [...wrapEvents(traceEvents), ...wrapFields(errorDocs)];

  function* generator(): SynthtraceGenerator<ApmFields> {
    yield* allEvents;
  }

  return generator();
}
