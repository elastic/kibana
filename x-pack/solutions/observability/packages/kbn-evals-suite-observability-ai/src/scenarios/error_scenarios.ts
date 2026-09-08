/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmErrorScenario } from './types';
import { PAYMENT_SERVICE_GCS, PAYMENT_UNREACHABLE_GCS, PRODUCT_CATALOG_GCS } from './constants';

const PAYMENT_SERVICE_FAILURE_SCENARIO_ID = 'payment-service-failure';
const PAYMENT_UNREACHABLE_SCENARIO_ID = 'payment-unreachable';
const PRODUCT_CATALOG_FAILURE_SCENARIO_ID = 'product-catalog-failure';

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

const PRODUCT_CATALOG_FAILURE_EXPECTED_OUTPUT = `-   Error summary:
    The frontend fails with "failed to prepare order: failed to get product #OLJCESPC7Z" because the \`product-catalog\` service returns a gRPC Internal error ("Product Catalog Fail Feature Flag Enabled") when retrieving that specific product. The root cause is the \`productCatalogFailure\` feature flag being enabled, which causes a deliberate fault injection in the product catalog service for product \`OLJCESPC7Z\`.

-   Failure pinpoint:

    -   The error is observed in the \`frontend\` service when preparing an order. It propagates from \`checkout\`, which calls \`product-catalog\` to validate cart items. The \`product-catalog\` service's \`GetProduct\` RPC fails for product ID \`OLJCESPC7Z\` with gRPC status Internal and message "Error: Product Catalog Fail Feature Flag Enabled".
    -   The failure originates in the \`product-catalog\` service, which evaluates the \`productCatalogFailure\` feature flag via the flagd provider. When the flag is enabled, the service intentionally rejects requests for this specific product. The feature flag evaluation itself succeeds (flagd dependency is healthy).
    -   This is a deliberate fault injection, not a code defect or infrastructure failure.
-   Impact:

    -   Any request that requires fetching product \`OLJCESPC7Z\` (product detail pages, checkout with this item in cart, recommendations including this product) will fail while the feature flag remains enabled.
    -   Other products are unaffected; \`ListProducts\` and \`SearchProducts\` do not check this flag.
    -   Multiple services in the trace report errors: \`product-catalog\`, \`checkout\`, \`frontend\`, and \`frontend-proxy\`, indicating user-facing impact on orders containing this product.
-   Immediate actions:

    1.  Disable the \`productCatalogFailure\` feature flag in the flagd configuration (\`demo.flagd.json\`) or set its \`defaultVariant\` to \`"off"\` to restore normal behavior.
    2.  Verify the flag state via the flagd OFREP API or management interface to confirm it is currently enabled.
    3.  Review recent changes to \`demo.flagd.json\` or flagd targeting rules to determine if the flag was enabled intentionally (e.g., chaos testing) or accidentally.
    4.  Monitor the \`product-catalog\` service error rate after toggling the flag to confirm the errors stop.`;

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
  [PRODUCT_CATALOG_FAILURE_SCENARIO_ID]: {
    id: PRODUCT_CATALOG_FAILURE_SCENARIO_ID,
    description:
      'Product catalog service fails on product OLJCESPC7Z due to productCatalogFailure feature flag',
    snapshotName: 'product-catalog',
    gcs: PRODUCT_CATALOG_GCS,
    errorQuery: {
      errorMessage: 'failed to prepare order: failed to get product #"OLJCESPC7Z"',
      serviceName: 'checkout',
    },
    expectedOutput: PRODUCT_CATALOG_FAILURE_EXPECTED_OUTPUT,
  },
};

export const getErrorScenarios = (): ApmErrorScenario[] => Object.values(APM_ERROR_SCENARIOS);

export type { ApmErrorScenario } from './types';
