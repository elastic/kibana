/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import {
  AGENT_BUILDER_SESSION_TAG,
  PAGE_CONTEXT_ATTACHMENT_ID,
  buildPageContextAttachment,
  describePageContext,
  type CatalogPageContext,
  type PageContext,
  type RepositoriesPageContext,
} from './page_context';
import {
  useAgentBuilderPageContext,
  type AgentBuilderSidebar,
  type PageContextAgentBuilder,
} from './use_agent_builder_page_context';

const catalogContext: CatalogPageContext = {
  tab: 'catalog',
  repositories: ['grafana/loki'],
  signalTypes: ['log'],
  severities: ['critical'],
  search: 'timeout',
  sort: 'score',
  total: 22,
};

const repositoriesContext: RepositoriesPageContext = { tab: 'repositories', total: 16 };

const contentOf = (context: PageContext) =>
  (
    buildPageContextAttachment(context, 'http://localhost/app/codeIntelligence').data as {
      content: string;
    }
  ).content;

const createAgentBuilder = (): jest.Mocked<PageContextAgentBuilder> => ({
  setChatConfig: jest.fn(),
  clearChatConfig: jest.fn(),
  addAttachment: jest.fn(),
  removeAttachment: jest.fn(),
});

const createSidebar = (initiallyOpen: boolean) => {
  const open$ = new BehaviorSubject(initiallyOpen);
  const sidebar: AgentBuilderSidebar = {
    isOpen: () => open$.getValue(),
    isOpen$: () => open$.asObservable(),
  };
  return { open$, sidebar };
};

describe('describePageContext', () => {
  it('describes the catalog filters and total', () => {
    expect(describePageContext(catalogContext)).toBe(
      'The user is viewing the Code Intelligence catalog tab filtered to grafana/loki, critical severity, log signals, search "timeout", 22 entries.'
    );
  });

  it('describes an unfiltered catalog', () => {
    expect(
      describePageContext({
        ...catalogContext,
        repositories: [],
        signalTypes: [],
        severities: [],
        search: '',
        total: 1,
      })
    ).toBe('The user is viewing the Code Intelligence catalog tab with no filters, 1 entry.');
  });

  it('names the open catalog entry', () => {
    expect(
      describePageContext({
        ...catalogContext,
        selectedEntry: {
          id: 'entry-1',
          repository: 'grafana/loki',
          title: 'Ingester flush failed',
          signal_type: 'log',
          query: 'FROM logs-* | LIMIT 10',
        },
      })
    ).toMatch(
      /^The user has the catalog entry "Ingester flush failed" \(grafana\/loki, log\) open/
    );
  });

  it('describes the repositories tab and its open flyout', () => {
    expect(describePageContext({ ...repositoriesContext, editingRepository: 'grafana/loki' })).toBe(
      'The user is viewing the Code Intelligence repositories tab with 16 repositories. The settings flyout for grafana/loki is open.'
    );
  });
});

describe('buildPageContextAttachment', () => {
  it('is a hidden text attachment with the description, URL, and flat fields', () => {
    const attachment = buildPageContextAttachment(catalogContext, 'http://localhost/app/x');
    expect(attachment).toMatchObject({
      id: PAGE_CONTEXT_ATTACHMENT_ID,
      type: 'text',
      hidden: true,
    });
    expect(contentOf(catalogContext).split('\n')).toEqual([
      describePageContext(catalogContext),
      'url: http://localhost/app/codeIntelligence',
      'tab: catalog',
      'repositories: ["grafana/loki"]',
      'signal_types: ["log"]',
      'severities: ["critical"]',
      'search: timeout',
      'sort: score',
      'total: 22',
    ]);
  });
});

describe('useAgentBuilderPageContext', () => {
  it('sets the chat config while the sidebar is closed', () => {
    const agentBuilder = createAgentBuilder();
    const { sidebar } = createSidebar(false);
    renderHook(() =>
      useAgentBuilderPageContext({ agentBuilder, sidebar, context: catalogContext })
    );

    expect(agentBuilder.setChatConfig).toHaveBeenCalledWith({
      sessionTag: AGENT_BUILDER_SESSION_TAG,
      attachments: [expect.objectContaining({ id: PAGE_CONTEXT_ATTACHMENT_ID })],
    });
    expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
  });

  it('upserts the attachment while the sidebar is open, so staged queries are kept', () => {
    const agentBuilder = createAgentBuilder();
    const { sidebar } = createSidebar(true);
    const { rerender } = renderHook(
      ({ context }: { context: PageContext }) =>
        useAgentBuilderPageContext({ agentBuilder, sidebar, context }),
      { initialProps: { context: catalogContext as PageContext } }
    );
    rerender({ context: repositoriesContext });

    expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
    expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(2);
    expect(
      (agentBuilder.addAttachment.mock.calls[1][0].data as { content: string }).content
    ).toContain('repositories tab with 16 repositories');
  });

  it('switches to upserting when the sidebar opens', () => {
    const agentBuilder = createAgentBuilder();
    const { open$, sidebar } = createSidebar(false);
    renderHook(() =>
      useAgentBuilderPageContext({ agentBuilder, sidebar, context: catalogContext })
    );
    expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);

    act(() => open$.next(true));

    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: PAGE_CONTEXT_ATTACHMENT_ID })
    );
  });

  it('does not resend an unchanged context on rerender', () => {
    const agentBuilder = createAgentBuilder();
    const { sidebar } = createSidebar(false);
    const { rerender } = renderHook(() =>
      useAgentBuilderPageContext({ agentBuilder, sidebar, context: catalogContext })
    );
    rerender();

    expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);
  });

  it('waits for the page to report a context', () => {
    const agentBuilder = createAgentBuilder();
    const { sidebar } = createSidebar(false);
    const { result } = renderHook(() =>
      useAgentBuilderPageContext({ agentBuilder, sidebar, context: undefined })
    );

    expect(result.current).toBeUndefined();
    expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
  });

  it('clears the chat config and removes the attachment when the app unmounts', () => {
    const agentBuilder = createAgentBuilder();
    const { sidebar } = createSidebar(true);
    const { unmount } = renderHook(() =>
      useAgentBuilderPageContext({ agentBuilder, sidebar, context: catalogContext })
    );
    unmount();

    expect(agentBuilder.clearChatConfig).toHaveBeenCalledTimes(1);
    expect(agentBuilder.removeAttachment).toHaveBeenCalledWith(PAGE_CONTEXT_ATTACHMENT_ID);
  });

  it('does nothing without Agent Builder', () => {
    const { result } = renderHook(() =>
      useAgentBuilderPageContext({
        agentBuilder: undefined,
        sidebar: undefined,
        context: catalogContext,
      })
    );

    expect(result.current).toMatchObject({ id: PAGE_CONTEXT_ATTACHMENT_ID });
  });
});
