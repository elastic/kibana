/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  APM_RELATED_ALERTS_ATTACHMENT_TYPE,
  type ApmRelatedAlertsAttachmentData,
} from '../../../common/agent_builder/attachments';
import { LazyAgentApmRelatedAlerts } from './lazy_agent_apm_related_alerts';

type ApmRelatedAlertsAttachment = Attachment<
  typeof APM_RELATED_ALERTS_ATTACHMENT_TYPE,
  ApmRelatedAlertsAttachmentData
>;

/** Exported separately so the definition object can be unit-tested without a live attachments service. */
export function createApmRelatedAlertsAttachmentDefinition() {
  return {
    getLabel: (attachment: ApmRelatedAlertsAttachment) =>
      attachment.data?.title ??
      i18n.translate('xpack.apm.agentBuilder.attachments.relatedAlerts.label', {
        defaultMessage: 'Related Alerts',
      }),
    getIcon: () => 'bell' as const,
    renderInlineContent: ({ attachment }: { attachment: ApmRelatedAlertsAttachment }) => (
      <LazyAgentApmRelatedAlerts data={attachment.data} />
    ),
  };
}

export const registerApmRelatedAlertsAttachment = (attachments: AttachmentServiceStartContract) => {
  attachments.addAttachmentType<ApmRelatedAlertsAttachment>(
    APM_RELATED_ALERTS_ATTACHMENT_TYPE,
    createApmRelatedAlertsAttachmentDefinition()
  );
};
