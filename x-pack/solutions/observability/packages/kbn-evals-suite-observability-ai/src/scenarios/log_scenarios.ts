/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogScenario } from './types';
import { PAYMENT_SERVICE_GCS, PAYMENT_UNREACHABLE_GCS, PRODUCT_CATALOG_GCS } from './constants';

const PAYMENT_UNREACHABLE_ERROR_LOG_ID = 'payment-unreachable-error-log';
const PRODUCT_CATALOG_ERROR_LOG_ID = 'product-catalog-error-log';
const INFO_LOG_ID = 'info-log';

const PAYMENT_UNREACHABLE_ERROR_LOG_EXPECTED = `-   What happened:
    A log entry indicates that the checkout or frontend service failed to charge a card because the payment service is unreachable. The gRPC connection fails with "name resolver error: produced zero addresses" and status Unavailable.

-   Where it originated:
    The error is logged by the service making the outbound gRPC call to \`oteldemo.PaymentService/Charge\`. The payment service itself is not reachable at the network level.

-   Root cause analysis:
    The payment service is unreachable — DNS or name resolution returns no addresses. This is a connectivity or infrastructure failure, not an application bug. The \`paymentUnreachable\` feature flag may be responsible.

-   Impact:
    All payment and checkout operations fail. Users cannot complete purchases.

-   Next steps:
    1.  Verify the payment service is running and healthy.
    2.  Check DNS resolution and network connectivity between checkout and payment services.
    3.  Check the \`paymentUnreachable\` feature flag state in flagd.`;

const PRODUCT_CATALOG_ERROR_LOG_EXPECTED = `-   What happened:
    The checkout service logged an error when attempting to prepare an order, because it failed to retrieve product OLJCESPC7Z from the product catalog service. The product catalog service returned a gRPC Internal error indicating the \`productCatalogFailure\` feature flag is enabled.

-   Where it originated:
    The error originates in the \`product-catalog\` service's \`GetProduct\` handler, which checks the \`productCatalogFailure\` feature flag and intentionally rejects requests for product ID \`OLJCESPC7Z\` when the flag is enabled.

-   Root cause analysis:
    This is a deliberate fault injection via the \`productCatalogFailure\` feature flag, not a code defect or infrastructure issue. The flagd dependency is healthy; the error is intentional.

-   Impact:
    Any request involving product \`OLJCESPC7Z\` (product detail pages, checkout, recommendations) fails while the flag is enabled. Other products are unaffected.

-   Next steps:
    1.  Disable the \`productCatalogFailure\` feature flag in the flagd configuration.
    2.  Review recent changes to determine if the flag was enabled intentionally.
    3.  Monitor the product-catalog service error rate after toggling the flag.`;

const INFO_LOG_EXPECTED = `-   What the log message means:
    This is a normal operational log entry from the \`recommendation\` service. It indicates that the service received a \`ListRecommendations\` request with a set of product IDs and is processing the request. The log level is info, confirming there is no error or warning condition.

-   Source:
    The log originates from the \`recommendation\` service's \`ListRecommendations\` gRPC handler, which returns product recommendations excluding the provided product IDs.

-   Context:
    This is expected operational behavior. The recommendation service is functioning normally, processing requests as designed. No investigation or action is required.`;

export const LOG_SCENARIOS: Record<string, LogScenario> = {
  [PAYMENT_UNREACHABLE_ERROR_LOG_ID]: {
    id: PAYMENT_UNREACHABLE_ERROR_LOG_ID,
    description: 'Error log when payment service is unreachable',
    snapshotName: 'payment-unreachable',
    gcs: PAYMENT_UNREACHABLE_GCS,
    logQuery: {
      messagePattern:
        '13 INTERNAL: failed to charge card: could not charge the card: rpc error: code = Unavailable desc = name resolver error: produced zero addresses',
      serviceName: 'frontend',
      index: 'logs-*',
    },
    expectedOutput: PAYMENT_UNREACHABLE_ERROR_LOG_EXPECTED,
  },
  [PRODUCT_CATALOG_ERROR_LOG_ID]: {
    id: PRODUCT_CATALOG_ERROR_LOG_ID,
    description: 'Error log when product catalog rejects product OLJCESPC7Z due to feature flag',
    snapshotName: 'product-catalog',
    gcs: PRODUCT_CATALOG_GCS,
    logQuery: {
      messagePattern: '13 INTERNAL: failed to prepare order: failed to get product #"OLJCESPC7Z"',
      serviceName: 'frontend',
      index: 'logs-*',
    },
    expectedOutput: PRODUCT_CATALOG_ERROR_LOG_EXPECTED,
  },
  [INFO_LOG_ID]: {
    id: INFO_LOG_ID,
    description: 'Info-level log entry from a healthy service',
    snapshotName: 'payment-service-failures',
    gcs: PAYMENT_SERVICE_GCS,
    logQuery: {
      messagePattern:
        'Receive ListRecommendations for product ids:["9SIQT8TOJO", "0PUK6V6EV0", "HQTGWGPNH4", "1YMWWN1N4O", "6E92ZMYYFZ"]',
      serviceName: 'recommendation',
      index: 'logs-*',
    },
    expectedOutput: INFO_LOG_EXPECTED,
  },
};

export const getLogScenarios = (): LogScenario[] => Object.values(LOG_SCENARIOS);

export type { LogScenario } from './types';
