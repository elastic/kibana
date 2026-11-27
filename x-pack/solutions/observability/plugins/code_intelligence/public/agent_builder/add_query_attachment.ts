/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { CatalogItem } from '../api';
import { isSignalType, signalTypeLabels } from '../signal_type_badge';
import type { AgentBuilderStager } from './agent_builder_stager';

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
  readonly stager: Pick<AgentBuilderStager, 'addQuery'>;
  readonly toasts: Pick<ToastsStart, 'addSuccess'>;
}

/** Stages the entry's query in the AI Agent sidebar, opening it if needed. */
export const addQueryAttachment = (
  { stager, toasts }: AddQueryDependencies,
  entry: CatalogItem
): void => {
  const attachment = buildQueryAttachment(entry);
  if (attachment === undefined) return;
  stager.addQuery(attachment);
  toasts.addSuccess(
    i18n.translate('xpack.codeIntelligence.agentBuilder.queryAddedToast', {
      defaultMessage: 'Added "{title}" to the AI Agent',
      values: { title: entry.title ?? entry.id },
    })
  );
};
