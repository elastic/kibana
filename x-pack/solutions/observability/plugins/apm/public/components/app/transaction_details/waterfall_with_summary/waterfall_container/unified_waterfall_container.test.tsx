/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { noop } from 'lodash';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import { disableConsoleWarning, renderWithTheme } from '../../../../../utils/test_helpers';
import { UnifiedWaterfallContainer } from './unified_waterfall_container';

jest.mock('react-virtualized', () => {
  const actual = jest.requireActual('react-virtualized');
  return {
    ...actual,
    AutoSizer: ({ children }: { children: (size: { width: number; height: number }) => any }) =>
      children({ width: 800, height: 600 }),
  };
});

jest.mock('../../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      application: { navigateToUrl: jest.fn() },
    },
  }),
}));

jest.mock('../../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: jest.fn().mockReturnValue('/mock-url'),
  }),
}));

jest.mock('../../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      flyoutDetailTab: 'metadata',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    },
  }),
}));

jest.mock('../../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2025-01-15T11:00:00.000Z',
    end: '2025-01-15T13:00:00.000Z',
  }),
}));

const createMockTraceItems = (): TraceItem[] => [
  {
    id: 'transaction-1',
    name: 'GET /api/products',
    timestampUs: new Date('2025-01-15T12:00:00.000Z').getTime() * 1000,
    traceId: 'trace-123',
    duration: 1000000,
    errors: [],
    serviceName: 'products-service',
    spanLinksCount: { incoming: 0, outgoing: 0 },
    docType: 'transaction',
    agentName: 'java',
  },
  {
    id: 'span-1',
    parentId: 'transaction-1',
    name: 'SELECT * FROM products',
    timestampUs: new Date('2025-01-15T12:00:00.100Z').getTime() * 1000,
    traceId: 'trace-123',
    duration: 500000,
    errors: [],
    serviceName: 'products-service',
    type: 'db',
    spanLinksCount: { incoming: 0, outgoing: 1 },
    docType: 'span',
    agentName: 'java',
  },
];

interface RenderOptions {
  traceItems?: TraceItem[];
  waterfallItemId?: string;
  initialPath?: string;
}

function renderUnifiedWaterfallContainer(options: RenderOptions = {}) {
  const { traceItems = createMockTraceItems(), waterfallItemId, initialPath = '/' } = options;

  const history = createMemoryHistory({ initialEntries: [initialPath] });

  const result = renderWithTheme(
    <Router history={history}>
      <UnifiedWaterfallContainer
        traceItems={traceItems}
        errors={[]}
        agentMarks={{}}
        serviceName="products-service"
        waterfallItemId={waterfallItemId}
        showCriticalPath={false}
        onShowCriticalPathChange={noop}
        entryTransactionId="transaction-1"
      />
    </Router>
  );

  return { ...result, history };
}

describe('UnifiedWaterfallContainer', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  describe('rendering', () => {
    it('renders trace items in the waterfall', async () => {
      const { getByText } = renderUnifiedWaterfallContainer();

      await waitFor(() => getByText('GET /api/products'));

      expect(getByText('GET /api/products')).toBeInTheDocument();
      expect(getByText('SELECT * FROM products')).toBeInTheDocument();
    });

    it('renders empty state when no trace items provided', () => {
      const { getByTestId } = renderUnifiedWaterfallContainer({ traceItems: [] });

      expect(getByTestId('traceWarning')).toBeInTheDocument();
    });

    it('renders legend component', async () => {
      const { getAllByText } = renderUnifiedWaterfallContainer();

      await waitFor(() => {
        expect(getAllByText('products-service').length).toBeGreaterThan(0);
      });
    });

    it('renders critical path control', async () => {
      const { getByTestId } = renderUnifiedWaterfallContainer();

      await waitFor(() => getByTestId('criticalPathToggle'));

      expect(getByTestId('criticalPathToggle')).toBeInTheDocument();
    });
  });

  describe('flyout navigation', () => {
    it('updates URL with waterfallItemId when clicking a trace item', async () => {
      const { getByText, history } = renderUnifiedWaterfallContainer();

      await waitFor(() => getByText('GET /api/products'));

      fireEvent.click(getByText('GET /api/products'));

      expect(history.location.search).toContain('waterfallItemId=transaction-1');
      expect(history.location.search).toContain('flyoutDetailTab=metadata');
    });

    it('updates URL when clicking a span item', async () => {
      const { getByText, history } = renderUnifiedWaterfallContainer();

      await waitFor(() => getByText('SELECT * FROM products'));

      fireEvent.click(getByText('SELECT * FROM products'));

      expect(history.location.search).toContain('waterfallItemId=span-1');
      expect(history.location.search).toContain('flyoutDetailTab=metadata');
    });
  });

  describe('flyout behavior', () => {
    it('does not render flyout when waterfallItemId is undefined', async () => {
      const { getByText, queryByRole } = renderUnifiedWaterfallContainer({
        waterfallItemId: undefined,
      });

      await waitFor(() => getByText('GET /api/products'));

      expect(getByText('GET /api/products')).toBeInTheDocument();
      expect(queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render flyout when waterfallItemId does not match any item', async () => {
      const { getByText, queryByRole } = renderUnifiedWaterfallContainer({
        waterfallItemId: 'non-existent-id',
      });

      await waitFor(() => getByText('GET /api/products'));

      expect(getByText('GET /api/products')).toBeInTheDocument();
      expect(queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
