/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertScenario } from './types';
import { PAYMENT_SERVICE_GCS, PAYMENT_UNREACHABLE_GCS } from './constants';

const PAYMENT_ERROR_COUNT_ALERT_SCENARIO_ID = 'payment-error-count-alert';
const PAYMENT_UNREACHABLE_ALERT_SCENARIO_ID = 'payment-unreachable-alert';

const PAYMENT_ALERT_EXPECTED_OUTPUT = `-   Summary: A single handled error was detected in the payment service, specifically related to an invalid token during a payment request. The error appears isolated, with no evidence of broader anomalies or downstream impact.

-   Assessment: The most plausible explanation is a user or client-side issue (invalid token) causing a handled error in the payment service. This is supported by a matching error log and absence of service anomalies or deployment changes. Support is limited to a single error group and no corroborating change points or anomalies.

-   Related signals:

    -   Errors: "Payment request failed. Invalid token. app.loyalty.level=gold" (apmErrors, last seen within alert window, Direct)---handled error, likely user input or session issue.
    -   Anomalies: None detected (apmServiceSummary, alert window, Unrelated)---no evidence of systemic or performance issues.
    -   Change points: None observed (apmServiceSummary, alert window, Unrelated)---no throughput or latency shifts.
    -   Downstream: Only checkout:5050 referenced in error trace; no evidence of propagation to flagd or other services (apmServiceTopology, Indirect).
-   Immediate actions:

    -   Review recent traces for the affected error group to confirm scope and verify if the error is isolated to specific users or requests.
    -   Validate that the error is properly handled and does not impact payment processing for valid tokens.
    -   If no further errors occur, monitor for recurrence but no urgent action is required. If errors increase, investigate token validation logic and upstream authentication flows.`;

const PAYMENT_UNREACHABLE_ALERT_EXPECTED = `-   Summary: An APM error count alert fired for the frontend service because the payment service is unreachable. The checkout flow fails with a gRPC Unavailable error ("name resolver error: produced zero addresses") when attempting to charge a card via the payment service. This is a connectivity or infrastructure failure, not an application code defect.

-   Assessment: The payment service is entirely unreachable from the checkout service — DNS or name resolution returns zero addresses for the payment endpoint. This causes all checkout attempts to fail, resulting in user-facing errors propagated through the frontend. The \`paymentUnreachable\` feature flag in flagd is the most likely cause if this is a test environment; otherwise, this indicates a real infrastructure issue (service down, DNS failure, network partition).

-   Related signals:

    -   Errors: "failed to charge card: could not charge the card: rpc error: code = Unavailable desc = name resolver error: produced zero addresses" (apmErrors, last seen within alert window, Direct) — all checkout/payment flows fail.
    -   Anomalies: Payment service absent from traces (apmServiceSummary, alert window, Direct) — the payment service is not running or not reachable.
    -   Downstream: checkout and frontend-proxy report errors due to payment unavailability (apmServiceTopology, Indirect).
-   Immediate actions:

    1.  Verify the payment service is running, healthy, and reachable from the checkout service's network.
    2.  Check DNS resolution for the payment service endpoint from within the checkout service's environment.
    3.  If using the \`paymentUnreachable\` feature flag, verify its state in flagd and disable it if unintentional.`;

export const ALERT_SCENARIOS: Record<string, AlertScenario> = {
  [PAYMENT_ERROR_COUNT_ALERT_SCENARIO_ID]: {
    id: PAYMENT_ERROR_COUNT_ALERT_SCENARIO_ID,
    description: 'APM error count alert for payment service invalid token',
    snapshotName: 'payment-service-failures',
    gcs: PAYMENT_SERVICE_GCS,
    alertRule: {
      ruleParams: {
        consumer: 'apm',
        enabled: true,
        name: 'Error count threshold - payment service',
        rule_type_id: 'apm.error_rate',
        tags: [],
        params: {
          threshold: 1,
          windowSize: 5,
          windowUnit: 'm',
          serviceName: 'payment',
          environment: 'ENVIRONMENT_ALL',
          groupBy: ['service.name', 'service.environment'],
        },
        actions: [],
        schedule: {
          interval: '1m',
        },
      },
      alertsIndex: '.alerts-observability.apm.alerts-default',
    },
    expectedOutput: PAYMENT_ALERT_EXPECTED_OUTPUT,
  },
  [PAYMENT_UNREACHABLE_ALERT_SCENARIO_ID]: {
    id: PAYMENT_UNREACHABLE_ALERT_SCENARIO_ID,
    description: 'APM error count alert for frontend when payment service is unreachable',
    snapshotName: 'payment-unreachable',
    gcs: PAYMENT_UNREACHABLE_GCS,
    alertRule: {
      ruleParams: {
        consumer: 'apm',
        enabled: true,
        name: 'Error count threshold - payment unreachable',
        rule_type_id: 'apm.error_rate',
        tags: [],
        params: {
          threshold: 1,
          windowSize: 5,
          windowUnit: 'm',
          serviceName: 'frontend',
          environment: 'ENVIRONMENT_ALL',
          groupBy: ['service.name', 'service.environment'],
        },
        actions: [],
        schedule: {
          interval: '1m',
        },
      },
      alertsIndex: '.alerts-observability.apm.alerts-default',
    },
    expectedOutput: PAYMENT_UNREACHABLE_ALERT_EXPECTED,
  },
};

export const getAlertScenarios = (): AlertScenario[] => Object.values(ALERT_SCENARIOS);

export type { AlertScenario } from './types';
