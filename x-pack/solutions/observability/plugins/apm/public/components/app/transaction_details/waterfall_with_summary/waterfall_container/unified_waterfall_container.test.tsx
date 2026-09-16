/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRACE_WATERFALL_EBT_ELEMENTS } from '@kbn/apm-ui-shared';
import { I18nProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { act, cleanup } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import { renderWithTheme } from '../../../../../utils/test_helpers';
import { UnifiedWaterfallContainer } from './unified_waterfall_container';

// Captures the latest props passed to TraceWaterfall
let capturedTraceWaterfallProps: Record<string, any> = {};

const MockTraceWaterfall = jest.fn((props: any) => {
  capturedTraceWaterfallProps = props;
  return <div data-test-subj="mock-trace-waterfall">{props.children}</div>;
});

jest.mock('../../../../../context/kibana_context/use_kibana', () => ({
  useKibana: () => ({
    services: {
      apmShared: {
        TraceWaterfall: MockTraceWaterfall,
      },
    },
  }),
}));

const mockNavigateToUrl = jest.fn();

jest.mock('../../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      application: { navigateToUrl: mockNavigateToUrl },
    },
  }),
}));

const mockRouterLink = jest.fn().mockReturnValue('/mock-service-overview-url');

jest.mock('../../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: mockRouterLink,
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

const mockUnifiedWaterfallFlyout = jest.fn((props: any) => (
  <div data-test-subj="mock-unified-waterfall-flyout" />
));

jest.mock('./unified_waterfall_flyout', () => ({
  UnifiedWaterfallFlyout: (props: any) => mockUnifiedWaterfallFlyout(props),
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
  traceDocsTotal?: number;
  maxTraceItems?: number;
  discoverHref?: string;
  showCriticalPath?: boolean;
}

function renderUnifiedWaterfallContainer(options: RenderOptions = {}) {
  const {
    traceItems = createMockTraceItems(),
    waterfallItemId,
    initialPath = '/',
    traceDocsTotal,
    maxTraceItems,
    discoverHref,
    showCriticalPath = false,
  } = options;

  const history = createMemoryHistory({ initialEntries: [initialPath] });

  const onShowCriticalPathChange = jest.fn();

  const result = renderWithTheme(
    <IntlProvider>
      <Router history={history}>
        <UnifiedWaterfallContainer
          traceItems={traceItems}
          errors={[]}
          agentMarks={{ testMark: 42 }}
          serviceName="products-service"
          waterfallItemId={waterfallItemId}
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={onShowCriticalPathChange}
          entryTransactionId="transaction-1"
          traceDocsTotal={traceDocsTotal}
          maxTraceItems={maxTraceItems}
          discoverHref={discoverHref}
        />
      </Router>
    </IntlProvider>
  );

  return { ...result, history, onShowCriticalPathChange };
}

describe('UnifiedWaterfallContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterLink.mockReturnValue('/mock-service-overview-url');
    capturedTraceWaterfallProps = {};
  });

  afterEach(() => {
    cleanup();
  });

  describe('prop forwarding', () => {
    it('passes traceItems, errors, and agentMarks to TraceWaterfall', () => {
      const traceItems = createMockTraceItems();
      renderUnifiedWaterfallContainer({ traceItems });

      expect(capturedTraceWaterfallProps.traceItems).toBe(traceItems);
      expect(capturedTraceWaterfallProps.errors).toEqual([]);
      expect(capturedTraceWaterfallProps.agentMarks).toEqual({ testMark: 42 });
    });

    it('passes serviceName, showCriticalPath, onShowCriticalPathChange, and entryTransactionId', () => {
      const { onShowCriticalPathChange } = renderUnifiedWaterfallContainer({
        showCriticalPath: true,
      });

      expect(capturedTraceWaterfallProps.serviceName).toBe('products-service');
      expect(capturedTraceWaterfallProps.showCriticalPath).toBe(true);
      expect(capturedTraceWaterfallProps.onShowCriticalPathChange).toBe(onShowCriticalPathChange);
      expect(capturedTraceWaterfallProps.entryTransactionId).toBe('transaction-1');
    });

    it('passes showLegend and showCriticalPathControl as true', () => {
      renderUnifiedWaterfallContainer();

      expect(capturedTraceWaterfallProps.showLegend).toBe(true);
      expect(capturedTraceWaterfallProps.showCriticalPathControl).toBe(true);
    });

    it('passes traceDocsTotal, maxTraceItems, and discoverHref', () => {
      renderUnifiedWaterfallContainer({
        traceDocsTotal: 10000,
        maxTraceItems: 5000,
        discoverHref: 'https://discover-link',
      });

      expect(capturedTraceWaterfallProps.traceDocsTotal).toBe(10000);
      expect(capturedTraceWaterfallProps.maxTraceItems).toBe(5000);
      expect(capturedTraceWaterfallProps.discoverHref).toBe('https://discover-link');
    });

    it('passes ebt config using TRACE_WATERFALL_EBT_ELEMENTS constants', () => {
      renderUnifiedWaterfallContainer();

      expect(capturedTraceWaterfallProps.ebt).toEqual({
        row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
        errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
        serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
      });
    });
  });

  describe('handleNodeClick (onClick)', () => {
    it('updates URL with waterfallItemId and default flyoutDetailTab=metadata', () => {
      const { history } = renderUnifiedWaterfallContainer();

      act(() => {
        capturedTraceWaterfallProps.onClick('transaction-1');
      });

      expect(history.location.search).toContain('waterfallItemId=transaction-1');
      expect(history.location.search).toContain('flyoutDetailTab=metadata');
    });

    it('updates URL with a custom flyoutDetailTab when provided', () => {
      const { history } = renderUnifiedWaterfallContainer();

      act(() => {
        capturedTraceWaterfallProps.onClick('span-1', { flyoutDetailTab: 'logs' });
      });

      expect(history.location.search).toContain('waterfallItemId=span-1');
      expect(history.location.search).toContain('flyoutDetailTab=logs');
    });
  });

  describe('handleErrorClick (onErrorClick)', () => {
    it('navigates to the error page for the matching trace item', () => {
      mockRouterLink.mockReturnValue('/services/products-service/errors?kuery=...');
      renderUnifiedWaterfallContainer();

      act(() => {
        capturedTraceWaterfallProps.onErrorClick({
          traceId: 'trace-123',
          docId: 'transaction-1',
        });
      });

      expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
      expect(mockRouterLink).toHaveBeenCalledWith(
        '/services/{serviceName}/errors',
        expect.objectContaining({
          path: { serviceName: 'products-service' },
        })
      );
    });

    it('does not navigate when the docId does not match any trace item', () => {
      renderUnifiedWaterfallContainer();

      act(() => {
        capturedTraceWaterfallProps.onErrorClick({
          traceId: 'trace-123',
          docId: 'non-existent-id',
        });
      });

      expect(mockNavigateToUrl).not.toHaveBeenCalled();
    });
  });

  describe('getServiceBadgeHref', () => {
    it('builds the href using the service name via the router', () => {
      renderUnifiedWaterfallContainer();

      const href = capturedTraceWaterfallProps.getServiceBadgeHref('my-service');

      expect(href).toBe('/mock-service-overview-url');
      expect(mockRouterLink).toHaveBeenCalledWith(
        '/services/{serviceName}/overview',
        expect.objectContaining({
          path: { serviceName: 'my-service' },
        })
      );
    });
  });

  describe('UnifiedWaterfallFlyout rendering', () => {
    it('renders the flyout with waterfallItemId and traceItems as props', () => {
      const traceItems = createMockTraceItems();
      renderUnifiedWaterfallContainer({ traceItems, waterfallItemId: 'transaction-1' });

      expect(mockUnifiedWaterfallFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          waterfallItemId: 'transaction-1',
          traceItems,
        })
      );
    });

    it('renders the flyout with undefined waterfallItemId when not provided', () => {
      const traceItems = createMockTraceItems();
      renderUnifiedWaterfallContainer({ traceItems });

      expect(mockUnifiedWaterfallFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          waterfallItemId: undefined,
          traceItems,
        })
      );
    });

    it('passes toggleFlyout function to the flyout', () => {
      renderUnifiedWaterfallContainer({ waterfallItemId: 'transaction-1' });

      expect(mockUnifiedWaterfallFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          toggleFlyout: expect.any(Function),
        })
      );
    });
  });
});
