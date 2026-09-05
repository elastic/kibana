/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  APM_RELATED_ALERTS_ATTACHMENT_TYPE,
  apmRelatedAlertsAttachmentDataSchema,
  type ApmRelatedAlertsAttachmentData,
} from '../../../common/agent_builder/attachments';

export const createApmRelatedAlertsAttachmentType = (): AttachmentTypeDefinition<
  typeof APM_RELATED_ALERTS_ATTACHMENT_TYPE,
  ApmRelatedAlertsAttachmentData
> => {
  return {
    id: APM_RELATED_ALERTS_ATTACHMENT_TYPE,
    validate: (input) => {
      const result = apmRelatedAlertsAttachmentDataSchema.safeParse(input);
      if (!result.success) {
        return { valid: false, error: result.error.message };
      }
      return { valid: true, data: result.data };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text' as const,
        value: JSON.stringify(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'A compact list of active and recently recovered APM alerts for the investigated service, with rule names, status badges, and reasons. Helps correlate ongoing incidents with the current investigation.',
    getTools: () => [],
  };
};
