/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import moment from 'moment';
import type { ErrorInsightParams } from '../src/clients/ai_insight_client';
import {
  OTEL_DEMO_SNAPSHOT_NAME,
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../src/data_generators/replay';
import { evaluate } from './evaluate_ai_insights';

const INDEX_REFRESH_WAIT_MS = 2500;

evaluate.describe('APM Error AI Insights', { tag: tags.serverless.observability.complete }, () => {
  let errorId: string;
  const serviceName = 'payment';
  let start: string;
  let end: string;

  evaluate.beforeAll(async ({ esClient, log }) => {
    end = moment().toISOString();
    start = moment().subtract(15, 'minutes').toISOString();

    await replayObservabilityDataStreams(esClient, log, OTEL_DEMO_SNAPSHOT_NAME);

    log.debug('Waiting to make sure all indices are refreshed');
    await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

    log.info('Querying for APM error ID');
    const errorsResponse = await esClient.search({
      index: 'logs-*',
      query: {
        bool: {
          filter: [
            { term: { 'error.exception.type': 'Error' } },
            {
              term: {
                'error.exception.message':
                  'Payment request failed. Invalid token. app.loyalty.level=gold',
              },
            },
            { term: { 'service.name': serviceName } },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      size: 1,
      _source: ['error.id', 'service.name', '@timestamp'],
    });

    const errorDoc = errorsResponse.hits.hits[0];
    if (!errorDoc) {
      throw new Error(`No APM error found for service ${serviceName}`);
    }

    const source = errorDoc._source as { error?: { id?: string } };
    errorId = source?.error?.id ?? (errorDoc._id as string);
    log.info(`Found APM error with ID: ${errorId}`);
  });

  evaluate('APM error analysis correctness', async ({ aiInsightClient, evaluateDataset }) => {
    await evaluateDataset<ErrorInsightParams>({
      getInsight: (params) => aiInsightClient.getErrorInsight(params),
      dataset: {
        name: 'ai insights: APM error analysis',
        description: 'Evaluates correctness of APM error AI insight summaries against ground truth',
        examples: [
          {
            input: {
              requestPayload: {
                errorId,
                serviceName,
                start,
                end,
              },
              question:
                'Analyze this APM error and provide an error summary, identify where the failure occurred (application code vs dependency), assess the impact and scope, and recommend 2-4 immediate actions.',
            },
            output: {
              expected: `-   Error summary:
    The payment service failed a charge request due to an "Invalid token" error, as indicated by the handled exception in the payment service and corroborated by error propagation through checkout and frontend services.

-   Failure pinpoint:

    -   The failure originates in the application code of the \`payment\` service, specifically in the \`charge\` function (\`/usr/src/app/charge.js:37:13\`), as shown in the stack trace and error message.
    -   The error message "Payment request failed. Invalid token. app.loyalty.level=gold" is consistent across the payment, checkout, and frontend services, confirming the root cause is within the payment service logic.
    -   Downstream dependency calls (e.g., to \`flagd\`) succeeded, ruling out dependency failure.
-   Impact:

    -   The error affects the entire payment flow, causing transaction failures in checkout and frontend services.
    -   Multiple services in the trace report errors: \`payment\`, \`checkout\`, \`frontend\`, and \`frontend-proxy\`, indicating broad user-facing impact for payment attempts.
-   Immediate actions:

    1.  Review the payment service's token validation logic in \`charge.js\` (line 37) for possible causes of invalid token rejection.
    2.  Check recent changes to authentication/token generation and propagation between frontend, checkout, and payment services.
    3.  Enable targeted debug logging around token handling in the payment service to capture token values and validation failures.
    4.  Validate that upstream services (checkout, frontend) are passing the expected token format and values.
-   Open questions:

    -   What is the source and expected format of the token being validated?
    -   Are there recent deployments or configuration changes in the payment or authentication services?
    -   Is the invalid token issue affecting all users or only those with specific attributes (e.g., \`app.loyalty.level=gold\`)?`,
            },
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    log.debug('Cleaning up indices');
    await cleanObservabilityDataStreams(esClient);
  });
});
