/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { TransactionTab, TransactionTabs } from './transaction_tabs';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import type { UnifiedWaterfallFetcherResult } from '../use_unified_waterfall_fetcher';
import { GENAI_EBT_CLICK_ACTIONS, type GenAiFields } from '@kbn/apm-ui-shared';
import { TRACE_SAMPLE_EBT_ELEMENTS } from './ebt_constants';

const mockUseGenAiData = jest.fn();

jest.mock('../../../shared/genai_tab/use_genai_data', () => ({
  useGenAiData: (params: unknown) => mockUseGenAiData(params),
}));

jest.mock('./waterfall_container/unified_waterfall_container', () => ({
  UnifiedWaterfallContainer: () => <div data-test-subj="unifiedWaterfallContainer" />,
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now' } }),
}));

jest.mock('../../../shared/links/discover_links/use_discover_href', () => ({
  useDiscoverHref: () => undefined,
}));

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const transaction = {
  '@timestamp': '2024-01-01T00:00:00.000Z',
  timestamp: { us: 1704067200000000 },
  trace: { id: 'trace-1' },
  transaction: { id: 'tx-1', duration: { us: 1000 } },
} as unknown as Transaction;

const unifiedWaterfallFetchResult = {
  traceItems: [],
  errors: [],
  agentMarks: [],
  traceDocsTotal: 0,
  maxTraceItems: 5000,
} as unknown as UnifiedWaterfallFetcherResult;

const genAiFields: GenAiFields = {
  operationName: 'chat',
  requestModel: 'gpt-4o',
  provider: 'openai',
  requestParams: {},
  response: {},
  inputMessages: [],
  outputMessages: [],
};

function mockGenAiData({ isGenAiSpan }: { isGenAiSpan: boolean }) {
  mockUseGenAiData.mockReturnValue({
    metadata: {},
    isMetadataLoading: false,
    isGenAiSpan,
    genAi: isGenAiSpan ? genAiFields : undefined,
  });
}

function renderTabs({ detailTab }: { detailTab?: TransactionTab } = {}) {
  const onTabClick = jest.fn();

  render(
    <EuiThemeProvider>
      <TransactionTabs
        transaction={transaction}
        isLoading={false}
        detailTab={detailTab}
        onTabClick={onTabClick}
        showCriticalPath={false}
        onShowCriticalPathChange={jest.fn()}
        unifiedWaterfallFetchResult={unifiedWaterfallFetchResult}
      />
    </EuiThemeProvider>
  );

  return { onTabClick };
}

describe('TransactionTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the GenAI tab when the transaction has gen_ai data', () => {
    mockGenAiData({ isGenAiSpan: true });
    renderTabs();

    expect(screen.getByTestId('genAiTab')).toBeInTheDocument();
  });

  it('does not show the GenAI tab when the transaction has no gen_ai data', () => {
    mockGenAiData({ isGenAiSpan: false });
    renderTabs();

    expect(screen.queryByTestId('genAiTab')).toBeNull();
  });

  it('adds the viewGenAi EBT click attributes to the GenAI tab', () => {
    mockGenAiData({ isGenAiSpan: true });
    renderTabs();

    const genAiTab = screen.getByTestId('genAiTab');
    expect(genAiTab).toHaveAttribute('data-ebt-action', GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI);
    expect(genAiTab).toHaveAttribute('data-ebt-element', TRACE_SAMPLE_EBT_ELEMENTS.TABS);
  });

  it('calls onTabClick with the genAi tab when the GenAI tab is clicked', async () => {
    mockGenAiData({ isGenAiSpan: true });
    const { onTabClick } = renderTabs();

    await userEvent.click(screen.getByTestId('genAiTab'));

    expect(onTabClick).toHaveBeenCalledWith(TransactionTab.genAi);
  });

  it('renders the GenAI tab content when the genAi tab is selected', () => {
    mockGenAiData({ isGenAiSpan: true });
    renderTabs({ detailTab: TransactionTab.genAi });

    expect(screen.getByTestId('genAiTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('genAiDetails')).toHaveTextContent('gpt-4o');
  });

  it('falls back to the timeline tab when the genAi tab is requested but not available', () => {
    mockGenAiData({ isGenAiSpan: false });
    renderTabs({ detailTab: TransactionTab.genAi });

    expect(screen.getByTestId('unifiedWaterfallContainer')).toBeInTheDocument();
  });
});
