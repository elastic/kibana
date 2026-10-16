/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import {
  PAGE_CONTEXT_ATTACHMENT_ID,
  buildPageContextAttachment,
  describePageContext,
  type CatalogPageContext,
  type FindingsPageContext,
  type PageContext,
  type RepositoriesPageContext,
} from './page_context';
import { useAgentBuilderPageContext } from './use_agent_builder_page_context';

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

const findingsContext: FindingsPageContext = {
  tab: 'findings',
  repositories: ['chatwoot/chatwoot'],
  statuses: ['open'],
  signalTypes: [],
  search: '',
  total: 82,
};

const contentOf = (context: PageContext) =>
  (
    buildPageContextAttachment(context, 'http://localhost/app/codeIntelligence').data as {
      content: string;
    }
  ).content;

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

  it('describes the findings tab and the open finding', () => {
    expect(describePageContext(findingsContext)).toBe(
      'The user is viewing the Code Intelligence findings tab filtered to chatwoot/chatwoot, open status, 82 findings.'
    );
    expect(
      describePageContext({
        ...findingsContext,
        selectedFinding: {
          id: 'finding-1',
          repository: 'chatwoot/chatwoot',
          title: 'Phone number in health error log',
          finding_type: 'sensitive-data',
          status: 'open',
          signal_type: 'log',
        },
      })
    ).toMatch(
      /^The user has the open sensitive-data finding "Phone number in health error log" \(chatwoot\/chatwoot, log, finding_id finding-1\) open on/
    );
  });

  it('describes the repositories tab and its open flyout', () => {
    expect(describePageContext({ ...repositoriesContext, editingRepository: 'grafana/loki' })).toBe(
      'The user is viewing the Code Intelligence repositories tab with 16 repositories. The settings flyout for grafana/loki is open.'
    );
  });
});

describe('buildPageContextAttachment', () => {
  it('is a hidden text attachment with the same description for every page', () => {
    const attachment = buildPageContextAttachment(catalogContext, 'http://localhost/app/x');
    expect(attachment).toMatchObject({
      id: PAGE_CONTEXT_ATTACHMENT_ID,
      type: 'text',
      hidden: true,
    });
    expect(attachment.description).toBe(
      buildPageContextAttachment(repositoriesContext, 'http://localhost/app/y').description
    );
  });

  it('has the summary, URL, and flat fields in its content', () => {
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

  it('has flat findings fields, including the open finding', () => {
    expect(
      contentOf({
        ...findingsContext,
        selectedFinding: { id: 'finding-1', title: 'T', status: 'verified' },
      }).split('\n')
    ).toEqual([
      expect.stringContaining('verified'),
      'url: http://localhost/app/codeIntelligence',
      'tab: findings',
      'repositories: ["chatwoot/chatwoot"]',
      'statuses: ["open"]',
      'signal_types: []',
      'search: ',
      'total: 82',
      'selected_finding_id: finding-1',
      'selected_finding_repository: ',
      'selected_finding_title: T',
      'selected_finding_type: ',
      'selected_finding_status: verified',
      'selected_finding_signal_type: ',
    ]);
  });
});

describe('useAgentBuilderPageContext', () => {
  const createStager = () => ({
    setPageContext: jest.fn(),
    addQuery: jest.fn(),
    stop: jest.fn(),
  });

  it('sends the page context and resends it only when it changes', () => {
    const stager = createStager();
    const { rerender } = renderHook(
      ({ context }: { context: PageContext }) => useAgentBuilderPageContext({ stager, context }),
      { initialProps: { context: catalogContext as PageContext } }
    );
    rerender({ context: catalogContext });
    expect(stager.setPageContext).toHaveBeenCalledTimes(1);
    expect(stager.setPageContext).toHaveBeenCalledWith(
      expect.objectContaining({ id: PAGE_CONTEXT_ATTACHMENT_ID })
    );

    rerender({ context: repositoriesContext });
    expect(stager.setPageContext).toHaveBeenCalledTimes(2);
    expect(stager.setPageContext.mock.calls[1][0].data.content).toContain(
      'repositories tab with 16 repositories'
    );
  });

  it('waits for the page to report a context', () => {
    const stager = createStager();
    renderHook(() => useAgentBuilderPageContext({ stager, context: undefined }));

    expect(stager.setPageContext).not.toHaveBeenCalled();
  });

  it('does nothing without Agent Builder', () => {
    expect(() =>
      renderHook(() => useAgentBuilderPageContext({ stager: undefined, context: catalogContext }))
    ).not.toThrow();
  });
});
