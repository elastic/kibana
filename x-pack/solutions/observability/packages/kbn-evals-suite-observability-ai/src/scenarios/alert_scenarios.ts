/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertScenario } from './types';
import { PAYMENT_SERVICE_GCS } from './constants';

const PAYMENT_ERROR_COUNT_ALERT_SCENARIO_ID = 'payment-error-count-alert';

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
};

export const getAlertScenarios = (): AlertScenario[] => Object.values(ALERT_SCENARIOS);

export type { AlertScenario } from './types';
