/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmErrorScenario, GcsConfig } from './types';
import { GCS_BUCKET, PAYMENT_SERVICE_GCS } from './constants';

const PAYMENT_SERVICE_FAILURE_SCENARIO_ID = 'payment-service-failure';
const PAYMENT_UNREACHABLE_SCENARIO_ID = 'payment-unreachable';

const PAYMENT_UNREACHABLE_GCS: GcsConfig = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-unreachable',
};

const PAYMENT_ERROR_EXPECTED_OUTPUT = `-   Error summary:
    The payment service failed to process a charge request due to an "Invalid token" error, as indicated by the handled exception in the payment service and corroborated by error propagation through checkout and frontend services.

-   Failure pinpoint:

    -   The failure originates in the application code of the \`payment\` service, specifically in the \`charge\` function (\`/usr/src/app/charge.js:37:13\`), as shown in the stack trace and error message.
    -   The error message "Payment request failed. Invalid token. app.loyalty.level=gold" is consistent across the payment, checkout, and frontend services, confirming that the root cause lies within the payment service logic.
    -   Downstream dependency calls (e.g., to \`flagd\`) succeeded, ruling out dependency failure.
-   Impact:

    -   The error affects the entire payment flow, causing transaction failures in checkout and frontend services.
    -   Multiple services in the trace report errors: \`payment\`, \`checkout\`, \`frontend\`, and \`frontend-proxy\`, indicating broad user-facing impact on payment attempts.
-   Immediate actions:

    1.  Review the payment service's token validation logic in \`charge.js\` (line 37) for possible causes of the invalid token rejection.
    2.  Check recent changes to authentication/token generation and propagation between frontend, checkout, and payment services.
    3.  Enable targeted debug logging around token handling in the payment service to capture token values and validation failures.
    4.  Validate that upstream services (checkout, frontend) are passing the expected token format and values.
-   Open questions:

    -   What is the source and expected format of the token being validated?
    -   Are there recent deployments or configuration changes in the payment or authentication services?
    -   Is the invalid token issue affecting all users or only those with specific attributes (e.g., \`app.loyalty.level=gold\`)?`;

const PAYMENT_UNREACHABLE_EXPECTED_OUTPUT = `-   Error summary:
    The frontend fails with "failed to charge card" because checkout cannot reach the payment service. This is a dependency failure: the payment service is unreachable (name resolver produced zero addresses / gRPC status Unavailable), not an application bug in the frontend, checkout, or payment code.

-   Failure pinpoint:

    -   The error is observed in the \`frontend\` service on the span \`executing api route (pages) /api/checkout\` (or \`grpc.oteldemo.CheckoutService/PlaceOrder\`); it propagates from \`checkout\`. The \`checkout\` service's dependency on \`oteldemo.PaymentService\` shows errorRate 1; the span \`oteldemo.PaymentService/Charge\` has \`event.outcome: failure\` with very short duration, indicating the connection was never established.
    -   The root cause is the dependency (payment service) being unreachable—wrong address, DNS, or service down—rather than an error inside the payment service application code. The message "name resolver error: produced zero addresses" and gRPC status Unavailable corroborate a connectivity or resolver failure.
    -   No \`payment\` service appears in the trace; only the checkout service's outbound call to \`oteldemo.PaymentService/Charge\` fails.
-   Impact:

    -   The entire payment/checkout flow is affected: users cannot complete checkout. \`frontend\`, \`checkout\`, and \`frontend-proxy\` report errors in the trace; \`payment\` does not appear.
-   Immediate actions:

    1.  Verify the payment service is running and healthy.
    2.  Check connectivity between checkout and payment (network, firewall, DNS).
    3.  Confirm \`PAYMENT_ADDR\` (or equivalent) in the checkout service configuration points to the correct payment service endpoint.
    4.  If using a feature flag or proxy that can redirect payment traffic (e.g., \`paymentUnreachable\`), ensure it is configured as intended for the environment.
-   Open questions:

    -   Why is the payment service unreachable (deployment, scaling, network partition)?
    -   Are there recent changes to service discovery, configuration, or infrastructure that could have broken connectivity?`;

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
  [PAYMENT_UNREACHABLE_SCENARIO_ID]: {
    id: PAYMENT_UNREACHABLE_SCENARIO_ID,
    description: 'Payment service is unreachable from checkout (dependency unavailable)',
    snapshotName: 'payment-unreachable',
    gcs: PAYMENT_UNREACHABLE_GCS,
    errorQuery: {
      errorMessage:
        '13 INTERNAL: failed to charge card: could not charge the card: rpc error: code = Unavailable desc = name resolver error: produced zero addresses',
      serviceName: 'frontend',
    },
    expectedOutput: PAYMENT_UNREACHABLE_EXPECTED_OUTPUT,
  },
};

export const getErrorScenarios = (): ApmErrorScenario[] => Object.values(APM_ERROR_SCENARIOS);

export type { ApmErrorScenario } from './types';
