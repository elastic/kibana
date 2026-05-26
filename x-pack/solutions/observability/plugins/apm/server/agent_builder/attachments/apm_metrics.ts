/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  APM_METRICS_ATTACHMENT_TYPE,
  apmMetricsAttachmentDataSchema,
  type ApmMetricsAttachmentData,
} from '../../../common/agent_builder/attachments';

export const createApmMetricsAttachmentType = (): AttachmentTypeDefinition<
  typeof APM_METRICS_ATTACHMENT_TYPE,
  ApmMetricsAttachmentData
> => {
  return {
    id: APM_METRICS_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = apmMetricsAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        return { valid: false, error: parseResult.error.message };
      }
      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value: JSON.stringify(attachment.data),
        }),
      };
    },
    getAgentDescription: () =>
      'An APM metrics attachment showing current vs baseline latency, error rate, and throughput for a service. Rendered as a comparison card with delta indicators.',
    getTools: () => [],
  };
};
