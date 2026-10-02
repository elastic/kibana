/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';

import type { CatalogItem } from '../api';
import {
  addQueryAttachment,
  buildQueryAttachment,
  describeQueryEntry,
  type AddQueryDependencies,
} from './add_query_attachment';
import { AGENT_BUILDER_SESSION_TAG } from './page_context';

const entry: CatalogItem = {
  id: 'entry-1',
  repository: 'elastic/eis-gateway',
  signal_type: 'log',
  title: 'Upstream request failed',
  description: 'Logged when the gateway cannot reach the inference service.',
  query: 'FROM logs-* | LIMIT 10',
};

const pageContext: AttachmentInput = {
  id: 'code-intelligence-page-context',
  type: 'text',
  hidden: true,
  data: { content: 'page' },
};

const createDependencies = (open: boolean) => {
  const dependencies = {
    agentBuilder: { openChat: jest.fn(), addAttachment: jest.fn() },
    sidebar: { isOpen: () => open },
    toasts: { addSuccess: jest.fn() },
    pageContext,
  };
  return dependencies as typeof dependencies & AddQueryDependencies;
};

describe('buildQueryAttachment', () => {
  it('builds an esql attachment keyed by the entry id', () => {
    const description =
      'Upstream request failed (elastic/eis-gateway, Log): Logged when the gateway cannot reach the inference service.';
    expect(buildQueryAttachment(entry)).toEqual({
      id: 'entry-1',
      type: 'esql',
      description,
      data: { query: 'FROM logs-* | LIMIT 10', description },
    });
  });

  it('leaves out missing parts of the description', () => {
    expect(describeQueryEntry({ id: 'entry-2', query: 'FROM x' })).toBe('entry-2');
    expect(describeQueryEntry({ id: 'entry-3', title: 'T', signal_type: 'span' })).toBe('T (span)');
  });

  it('has no attachment for an entry without a query', () => {
    expect(buildQueryAttachment({ ...entry, query: '  ' })).toBeUndefined();
    expect(buildQueryAttachment({ ...entry, query: undefined })).toBeUndefined();
  });
});

describe('addQueryAttachment', () => {
  it('opens a closed sidebar with the page context and the query', () => {
    const dependencies = createDependencies(false);
    addQueryAttachment(dependencies, entry);

    expect(dependencies.agentBuilder.openChat).toHaveBeenCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [pageContext, buildQueryAttachment(entry)],
    });
    expect(dependencies.agentBuilder.addAttachment).not.toHaveBeenCalled();
    expect(dependencies.toasts.addSuccess).toHaveBeenCalledWith(
      'Added "Upstream request failed" to the AI Agent'
    );
  });

  it('adds the query to an open sidebar without replacing what is staged', () => {
    const dependencies = createDependencies(true);
    addQueryAttachment(dependencies, entry);

    expect(dependencies.agentBuilder.addAttachment).toHaveBeenCalledWith(
      buildQueryAttachment(entry)
    );
    expect(dependencies.agentBuilder.openChat).not.toHaveBeenCalled();
  });

  it('does nothing for an entry without a query', () => {
    const dependencies = createDependencies(true);
    addQueryAttachment(dependencies, { ...entry, query: undefined });

    expect(dependencies.agentBuilder.addAttachment).not.toHaveBeenCalled();
    expect(dependencies.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
