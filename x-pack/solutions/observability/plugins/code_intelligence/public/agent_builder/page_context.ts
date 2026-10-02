/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';

import type { CatalogItem } from '../api';

export const AGENT_BUILDER_SESSION_TAG = 'code_intelligence';
export const PAGE_CONTEXT_ATTACHMENT_ID = 'code-intelligence-page-context';

export interface RepositoriesPageContext {
  readonly tab: 'repositories';
  readonly total: number;
  /** The repository whose settings flyout is open, if any. */
  readonly editingRepository?: string;
}

export interface CatalogPageContext {
  readonly tab: 'catalog';
  readonly repositories: readonly string[];
  readonly signalTypes: readonly string[];
  readonly severities: readonly string[];
  readonly search: string;
  readonly sort: string;
  /** Absent until the first catalog page loads. */
  readonly total?: number;
  /** The entry whose details flyout is open, if any. */
  readonly selectedEntry?: Pick<
    CatalogItem,
    'id' | 'repository' | 'title' | 'signal_type' | 'query'
  >;
}

export type PageContext = RepositoriesPageContext | CatalogPageContext;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const describeCatalog = (context: CatalogPageContext): string => {
  const filters = [
    ...(context.repositories.length > 0 ? [context.repositories.join(' or ')] : []),
    ...(context.severities.length > 0 ? [`${context.severities.join(' or ')} severity`] : []),
    ...(context.signalTypes.length > 0 ? [`${context.signalTypes.join(' or ')} signals`] : []),
    ...(context.search === '' ? [] : [`search "${context.search}"`]),
  ];
  const view = `the Code Intelligence catalog tab ${
    filters.length === 0 ? 'with no filters' : `filtered to ${filters.join(', ')}`
  }${context.total === undefined ? '' : `, ${plural(context.total, 'entry', 'entries')}`}`;
  const entry = context.selectedEntry;
  if (entry === undefined) return `The user is viewing ${view}.`;
  return `The user has the catalog entry "${entry.title ?? entry.id}" (${
    entry.repository ?? 'unknown repository'
  }, ${entry.signal_type ?? 'unknown signal type'}) open on ${view}.`;
};

const describeRepositories = (context: RepositoriesPageContext): string =>
  `The user is viewing the Code Intelligence repositories tab with ${plural(
    context.total,
    'repository',
    'repositories'
  )}.${
    context.editingRepository === undefined
      ? ''
      : ` The settings flyout for ${context.editingRepository} is open.`
  }`;

/** 1 sentence for the agent that says what the user sees. */
export const describePageContext = (context: PageContext): string =>
  context.tab === 'catalog' ? describeCatalog(context) : describeRepositories(context);

/** Flat string values, like the `additional_data` Discover sends; arrays are JSON strings. */
export const pageContextData = (context: PageContext): Record<string, string> => {
  if (context.tab === 'repositories') {
    return {
      tab: context.tab,
      total: String(context.total),
      ...(context.editingRepository === undefined
        ? {}
        : { editing_repository: context.editingRepository }),
    };
  }
  const entry = context.selectedEntry;
  return {
    tab: context.tab,
    repositories: JSON.stringify(context.repositories),
    signal_types: JSON.stringify(context.signalTypes),
    severities: JSON.stringify(context.severities),
    search: context.search,
    sort: context.sort,
    ...(context.total === undefined ? {} : { total: String(context.total) }),
    ...(entry === undefined
      ? {}
      : {
          selected_entry_id: entry.id,
          selected_entry_repository: entry.repository ?? '',
          selected_entry_title: entry.title ?? '',
          selected_entry_signal_type: entry.signal_type ?? '',
          selected_entry_query: entry.query ?? '',
        }),
  };
};

/**
 * A hidden `text` attachment rather than `screen_context`: on later messages Agent Builder
 * writes its generic app, URL, and time range over the first `screen_context` attachment in
 * the conversation, which would be this one. The description stays static because later
 * messages update the content but keep the first description.
 */
export const buildPageContextAttachment = (context: PageContext, url: string): AttachmentInput => ({
  id: PAGE_CONTEXT_ATTACHMENT_ID,
  type: AttachmentType.text,
  hidden: true,
  description:
    'Code Intelligence page context: the tab, filters, totals, and open catalog entry or repository the user is viewing. Read it before answering questions about this page or what the user is looking at.',
  data: {
    content: [
      describePageContext(context),
      `url: ${url}`,
      ...Object.entries(pageContextData(context)).map(([key, value]) => `${key}: ${value}`),
    ].join('\n'),
  },
});
