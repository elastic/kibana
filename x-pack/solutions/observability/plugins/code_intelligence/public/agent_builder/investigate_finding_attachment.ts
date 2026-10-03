/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { FindingItem } from '../api';
import type { AgentBuilderStager } from './agent_builder_stager';

/** The skill tells the agent to look for this prefix, so keep it in sync with the skill content. */
export const FINDING_ATTACHMENT_DESCRIPTION_PREFIX = 'Code Intelligence finding';

export const findingAttachmentId = (finding: Pick<FindingItem, 'id'>): string =>
  `code-intelligence-finding-${finding.id}`;

const location = ({ path, line }: { path?: string; line?: number }): string =>
  path === undefined ? '' : line === undefined ? path : `${path}:${line}`;

/**
 * The finding as a `text` attachment the agent reads before investigating. It carries the
 * id so the agent can fetch the full document and update the status, plus the evidence so a
 * first answer needs no extra call.
 */
export const buildFindingAttachment = (finding: FindingItem): AttachmentInput => {
  const evidence = (finding.evidence ?? []).flatMap((entry) => {
    const where = location(entry);
    const excerpt = entry.excerpt ?? '';
    if (where === '' && excerpt === '') return [];
    return [[where, excerpt].filter((part) => part !== '').join('\n')];
  });
  const lines = [
    `${FINDING_ATTACHMENT_DESCRIPTION_PREFIX} to investigate.`,
    `finding_id: ${finding.id}`,
    `finding_type: ${finding.finding_type ?? ''}`,
    `status: ${finding.status ?? ''}`,
    `repository: ${finding.repository ?? ''}`,
    `revision: ${finding.revision ?? ''}`,
    `signal_type: ${finding.signal_type ?? ''}`,
    ...(finding.log_level === undefined ? [] : [`log_level: ${finding.log_level}`]),
    `cataloged: ${finding.cataloged === true ? 'yes' : 'no'}`,
    `title: ${finding.title ?? ''}`,
    `summary: ${finding.summary ?? ''}`,
    ...(finding.review_note === undefined || finding.review_note === null
      ? []
      : [`review_note: ${finding.review_note}`]),
    '',
    'evidence:',
    ...(evidence.length === 0 ? ['(none)'] : evidence.map((entry) => `---\n${entry}`)),
  ];
  return {
    id: findingAttachmentId(finding),
    type: AttachmentType.text,
    description: `${FINDING_ATTACHMENT_DESCRIPTION_PREFIX}: ${finding.title ?? finding.id}${
      finding.repository === undefined ? '' : ` (${finding.repository})`
    }`,
    data: { content: lines.join('\n') },
  };
};

export interface InvestigateFindingDependencies {
  readonly stager: Pick<AgentBuilderStager, 'addQuery'>;
  readonly toasts: Pick<ToastsStart, 'addSuccess'>;
}

/** Stages the finding in the AI Agent sidebar, opening it if needed. */
export const investigateFinding = (
  { stager, toasts }: InvestigateFindingDependencies,
  finding: FindingItem
): void => {
  stager.addQuery(buildFindingAttachment(finding));
  toasts.addSuccess(
    i18n.translate('xpack.codeIntelligence.agentBuilder.findingAddedToast', {
      defaultMessage: 'Added finding "{title}" to the AI Agent',
      values: { title: finding.title ?? finding.id },
    })
  );
};
