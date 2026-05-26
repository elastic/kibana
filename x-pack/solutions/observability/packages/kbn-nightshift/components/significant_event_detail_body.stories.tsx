/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SignificantEventDetailBody } from './significant_event_detail_body';
import type { SignificantEventDetailFields } from './significant_event_detail_body';

const meta: Meta<typeof SignificantEventDetailBody> = {
  title: 'app/Nightshift/SignificantEventDetailBody',
  component: SignificantEventDetailBody,
};

export default meta;
type Story = StoryObj<typeof SignificantEventDetailBody>;

const paymentProcessingFailures: SignificantEventDetailFields = {
  id: '6378a33b-4d01-4754-9c10-738fb45efc5b-cfb50bec-4473-470d-ab61-c139688e5442-payment__payment-processing-failures',
  label: 'Payment — processing failures',
  subtitle: 'logs.otel',
  summary:
    'Payment processing failures have been continuously firing at high volume since ~10:30, with a sustained peak of 1404 alerts per 30 minutes. Recent error logs show repeated charge failures, indicating ongoing impact to payment completion flow.',
  rootCause:
    'Payment processing is failing because the payment/charge path is unable to connect to a downstream backend needed to complete card charges: recent failures show gRPC Unavailable with a TCP connection refused while dialing a backend on port 9999. Checkout is exposed because it depends on payment for order completion (checkout → payment).',
  recommendations: [
    'Restore the backend service on port 9999 that the payment service is dialing for card charges — TCP connection refused indicates the target is down or the port binding has been lost; check the payment pod and its sidecar or dependency processes.',
    'Restrict access to logs.otel for the payment service deployment (resource.attributes.k8s.deployment.name: "payment") to limit exposure of plaintext credit card fields already written to the log store, and deploy a redaction fix to the payment service charge request logging path.',
    'Inspect the checkout service for cascading order failures: the checkout → payment dependency edge is exposed, meaning every PlaceOrder call is currently failing at the payment charge step.',
  ],
  recommendedAction: 'escalate',
  criticality: 85,
  ruleNames: ['Payment processing failures'],
  streamNames: ['logs.otel'],
  evidences: [
    {
      description:
        'Payment/charge error logs found in the last 120 minutes. Recent rows include gRPC Unavailable failures during card charging, with a downstream dial TCP connection refused on port 9999.',
      esqlQuery:
        'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE ((body.text : "payment") OR (body.text : "charge")) AND ((body.text : "fail") OR (body.text : "error") OR (body.text : "refused")) | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
      result: 'found',
      rowCount: 5,
      collectedAt: '2026-05-01T13:47:38Z',
      ruleName: 'Payment processing failures',
      streamName: 'logs.otel',
    },
    {
      description:
        'Sensitive payment request fields were present in logs in the last 120 minutes: payment service log entries included plaintext credit card number and CVV fields in the logged request object.',
      esqlQuery:
        'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE (body.text : "creditCardNumber") OR (body.text : "creditCardCvv") | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
      result: 'found',
      rowCount: 5,
      collectedAt: '2026-05-01T13:47:38Z',
      ruleName: 'Payment processing failures',
      streamName: 'logs.otel',
    },
    {
      description:
        'Re-verification of payment/charge failure pattern — failures are occurring at the current moment. Pattern is consistent: gRPC Unavailable with TCP connection refused on port 9999 during the charge path.',
      esqlQuery:
        'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE ((body.text : "payment") OR (body.text : "charge")) AND ((body.text : "fail") OR (body.text : "error") OR (body.text : "refused")) | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
      result: 'found',
      rowCount: 5,
      collectedAt: '2026-05-01T16:16:36Z',
      ruleName: 'Payment processing failures',
      streamName: 'logs.otel',
      confirmed: true,
    },
  ],
  dependencyEdges: [
    {
      source: 'checkout',
      target: 'payment',
      protocol: 'internal',
      exposure: 'exposed',
    },
  ],
  causeKis: [
    {
      name: 'payment-service',
      streamName: 'logs.otel',
    },
  ],
  timestamp: '2026-05-01T08:52:56-05:00',
};

const stderrOutputEvent: SignificantEventDetailFields = {
  id: '6378a33b-multi-service__stderr-output-across-services',
  label: 'Multiple services — elevated stderr output',
  subtitle: 'logs.otel',
  summary:
    'Stderr output across services shifted with high sustained volume (2031 alerts). Direct keyword search for stderr text returned no hits in the same stream, suggesting the detection is based on severity metadata rather than body text.',
  rootCause:
    'Multiple services are emitting more stderr-formatted output, consistent with increased exception/stack-trace style logging. The shift in severity distribution indicates underlying error conditions propagating across the service mesh.',
  recommendations: [
    'Query logs.otel using a stats aggregation on resource.attributes.app to identify which services are generating the increased output volume.',
    'Inspect log level distribution in logs.otel over the last hour using severity_text fields.',
  ],
  recommendedAction: 'monitor',
  criticality: 65,
  ruleNames: ['Stderr output across services'],
  streamNames: ['logs.otel'],
  evidences: [],
  dependencyEdges: [],
  causeKis: [],
  timestamp: '2026-05-01T16:31:00+00:00',
};

export const PaymentProcessingFailures: Story = {
  args: {
    event: paymentProcessingFailures,
    detectedAtLabel: 'Detected 12 minutes ago',
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const ElevatedStderrOutput: Story = {
  args: {
    event: stderrOutputEvent,
    detectedAtLabel: 'Detected 30 minutes ago',
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const HideHeader: Story = {
  args: {
    event: paymentProcessingFailures,
    hideHeader: true,
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};
