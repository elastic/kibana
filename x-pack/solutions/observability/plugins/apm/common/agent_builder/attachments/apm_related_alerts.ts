/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const APM_RELATED_ALERTS_ATTACHMENT_TYPE = 'observability.apm-related-alerts' as const;

// Upper bound on free-form string inputs to avoid unbounded-string DoS (CodeQL).
const MAX_LABEL_LENGTH = 1024;

const alertItemSchema = z.object({
  /** UUID of the alert document (kibana.alert.uuid) */
  id: z.string().max(MAX_LABEL_LENGTH),
  /** Human-readable rule name */
  ruleName: z.string().max(MAX_LABEL_LENGTH),
  /** Rule type id, e.g. apm.transaction_duration */
  ruleTypeId: z.string().max(MAX_LABEL_LENGTH),
  /** Current lifecycle status */
  status: z.enum(['active', 'recovered']),
  /** Short human reason string from kibana.alert.reason */
  reason: z.string().max(MAX_LABEL_LENGTH).optional(),
  /** Service name this alert is scoped to, if available */
  serviceName: z.string().max(MAX_LABEL_LENGTH).optional(),
  /** Alert start time as Unix epoch milliseconds */
  start: z.number(),
  /** Duration in milliseconds (only set for recovered alerts) */
  duration: z.number().optional(),
  /** Severity: critical | high | medium | low */
  severity: z.string().max(MAX_LABEL_LENGTH).optional(),
});

export const apmRelatedAlertsAttachmentDataSchema = z.object({
  /** Primary service name this attachment is scoped to */
  serviceName: z.string().max(MAX_LABEL_LENGTH),
  environment: z.string().max(MAX_LABEL_LENGTH).optional(),
  title: z.string().max(MAX_LABEL_LENGTH).optional(),
  alerts: z.array(alertItemSchema),
});

export type AlertItem = z.infer<typeof alertItemSchema>;
export type ApmRelatedAlertsAttachmentData = z.infer<typeof apmRelatedAlertsAttachmentDataSchema>;
