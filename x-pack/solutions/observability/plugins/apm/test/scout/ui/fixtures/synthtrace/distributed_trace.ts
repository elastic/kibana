/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, httpExitSpan, timerange } from '@kbn/synthtrace-client';
import {
  START_DATE,
  END_DATE,
  PRODUCTION_ENVIRONMENT,
  SERVICE_WATERFALL_RUM,
  SERVICE_WATERFALL_NODE,
  WATERFALL_RUM_TRANSACTION_NAME,
  WATERFALL_NODE_TRANSACTION_NAME,
} from '../constants';

const WATERFALL_NODE_ERROR_MESSAGE = 'Database query failed';
const WATERFALL_RUM_ERROR_MESSAGE_1 = 'Request timeout';
const WATERFALL_RUM_ERROR_MESSAGE_2 = 'Request failed';

/**
 * Generates a two-level distributed trace for testing the TraceWaterfallFlyout.
 *
 * Structure:
 *   apm-waterfall-rum (root)
 *   └── GET /api/products (HTTP exit span)
 *       └── apm-waterfall-node: GET /api/products (child transaction)
 *           └── SELECT * FROM products (DB span)
 *
 * Navigating to the apm-waterfall-node transaction will show the "View full trace"
 * button as enabled (since the root is the rum service), allowing the
 * TraceWaterfallFlyout to be opened.
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

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return rumService
        .transaction({ transactionName: WATERFALL_RUM_TRANSACTION_NAME })
        .timestamp(timestamp)
        .duration(500)
        .failure()
        .errors(
          rumService.error({ message: WATERFALL_RUM_ERROR_MESSAGE_1 }).timestamp(timestamp),
          rumService.error({ message: WATERFALL_RUM_ERROR_MESSAGE_2 }).timestamp(timestamp)
        )
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
                .errors(
                  nodeService.error({ message: WATERFALL_NODE_ERROR_MESSAGE }).timestamp(timestamp)
                )
                .children(
                  nodeService
                    .span({
                      spanName: 'SELECT * FROM products',
                      spanType: 'db',
                      spanSubtype: 'postgresql',
                    })
                    .timestamp(timestamp + 50)
                    .duration(100)
                    .success()
                )
            )
        );
    });
}
