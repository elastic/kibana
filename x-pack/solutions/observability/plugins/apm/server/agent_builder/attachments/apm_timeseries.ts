/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  APM_TIMESERIES_ATTACHMENT_TYPE,
  apmTimeseriesAttachmentDataSchema,
  type ApmTimeseriesAttachmentData,
} from '../../../common/agent_builder/attachments';

export const createApmTimeseriesAttachmentType = (): AttachmentTypeDefinition<
  typeof APM_TIMESERIES_ATTACHMENT_TYPE,
  ApmTimeseriesAttachmentData
> => {
  return {
    id: APM_TIMESERIES_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = apmTimeseriesAttachmentDataSchema.safeParse(input);
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
      'An APM timeseries attachment showing a metric (latency, error rate, or throughput) over time as a line chart. Optionally annotated with an alert threshold and alert start time.',
    getTools: () => [],
  };
};
