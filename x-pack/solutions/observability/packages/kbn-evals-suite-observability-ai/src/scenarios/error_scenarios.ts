/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmErrorScenario, GcsConfig } from './types';

export const GCS_BUCKET = 'obs-ai-datasets';

const PAYMENT_SERVICE_FAILURE_SCENARIO_ID = 'payment-service-failure';

const PAYMENT_SERVICE_GCS: GcsConfig = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-service-failures',
};

const PAYMENT_ERROR_EXPECTED_OUTPUT = `-   Error summary:
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
    -   Is the invalid token issue affecting all users or only those with specific attributes (e.g., \`app.loyalty.level=gold\`)?`;

export const APM_ERROR_SCENARIOS: Record<string, ApmErrorScenario> = {
  [PAYMENT_SERVICE_FAILURE_SCENARIO_ID]: {
    id: PAYMENT_SERVICE_FAILURE_SCENARIO_ID,
    description: 'Payment service fails due to invalid token error',
    snapshotName: 'payment-service-failures',
    gcs: PAYMENT_SERVICE_GCS,
    errorQuery: {
      errorMessage: 'Payment request failed. Invalid token. app.loyalty.level=gold',
      serviceName: 'payment',
    },
    expectedOutput: PAYMENT_ERROR_EXPECTED_OUTPUT,
  },
};

export const getErrorScenarios = (): ApmErrorScenario[] => Object.values(APM_ERROR_SCENARIOS);

export type { ApmErrorScenario } from './types';
