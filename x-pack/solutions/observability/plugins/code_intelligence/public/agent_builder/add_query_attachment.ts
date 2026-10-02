/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { CatalogItem } from '../api';
import { isSignalType, signalTypeLabels } from '../signal_type_badge';
import { AGENT_BUILDER_SESSION_TAG } from './page_context';
import type { AgentBuilderSidebar } from './use_agent_builder_page_context';

const signalLabel = (signalType: string | undefined): string | undefined =>
  isSignalType(signalType) ? signalTypeLabels[signalType] : signalType;

/** `"<title> (<repository>, <signal type>): <description>"`, leaving out missing parts. */
export const describeQueryEntry = (entry: CatalogItem): string => {
  const details = [entry.repository, signalLabel(entry.signal_type)].filter(
    (part): part is string => part !== undefined && part !== ''
  );
  const heading = `${entry.title ?? entry.id}${
    details.length === 0 ? '' : ` (${details.join(', ')})`
  }`;
  return entry.description === undefined || entry.description === ''
    ? heading
    : `${heading}: ${entry.description}`;
};

export const hasQuery = (entry: CatalogItem): entry is CatalogItem & { query: string } =>
  entry.query !== undefined && entry.query.trim() !== '';

/** Absent when the entry has no query. The id is the entry id, so adding it twice is a no-op. */
export const buildQueryAttachment = (entry: CatalogItem): AttachmentInput | undefined => {
  if (!hasQuery(entry)) return undefined;
  const description = describeQueryEntry(entry);
  return {
    id: entry.id,
    type: AttachmentType.esql,
    description,
    data: { query: entry.query, description },
  };
};

export interface AddQueryDependencies {
  readonly agentBuilder: Pick<AgentBuilderPluginStart, 'openChat' | 'addAttachment'>;
  readonly sidebar: Pick<AgentBuilderSidebar, 'isOpen'>;
  readonly toasts: Pick<ToastsStart, 'addSuccess'>;
  /** The page context attachment, resent because `openChat` options replace the chat config. */
  readonly pageContext: AttachmentInput | undefined;
}

/**
 * Stages the entry's query in the AI Agent sidebar. An open sidebar gets the attachment upserted
 * next to queries already staged. A closed one is opened with it, because `addAttachment` is a
 * no-op until the sidebar has finished mounting.
 */
export const addQueryAttachment = (
  { agentBuilder, sidebar, toasts, pageContext }: AddQueryDependencies,
  entry: CatalogItem
): void => {
  const attachment = buildQueryAttachment(entry);
  if (attachment === undefined) return;
  if (sidebar.isOpen()) {
    agentBuilder.addAttachment(attachment);
  } else {
    agentBuilder.openChat({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: pageContext === undefined ? [attachment] : [pageContext, attachment],
    });
  }
  toasts.addSuccess(
    i18n.translate('xpack.codeIntelligence.agentBuilder.queryAddedToast', {
      defaultMessage: 'Added "{title}" to the AI Agent',
      values: { title: entry.title ?? entry.id },
    })
  );
};
