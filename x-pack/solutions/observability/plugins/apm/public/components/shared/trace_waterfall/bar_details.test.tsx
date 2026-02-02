/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarDetails } from './bar_details';

jest.mock('../../../../common/utils/formatters', () => ({
  asDuration: (value: number) => `${value} ms`,
}));
jest.mock('./trace_waterfall_context', () => ({
  useTraceWaterfallContext: jest.fn(),
}));

import { useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';

describe('BarDetails', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    (useTraceWaterfallContext as jest.Mock).mockReturnValue({
      getRelatedErrorsHref: undefined,
    });
  });

  const mockItem = {
    name: 'Test Span',
    duration: 1234,
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
  } as unknown as TraceWaterfallItem;

  it('renders icon', () => {
    const { getByTestId } = render(
      <BarDetails item={{ ...mockItem, icon: 'database' }} left={10} />
    );
    expect(getByTestId('apmBarDetailsIcon')).toBeInTheDocument();
  });

  it('renders the span name and formatted duration', () => {
    const { getByText } = render(<BarDetails item={mockItem} left={10} />);
    expect(getByText('Test Span')).toBeInTheDocument();
    expect(getByText('1234 ms')).toBeInTheDocument();
  });

  it('applies correct min-width style based on left prop', () => {
    const { container } = render(<BarDetails item={mockItem} left={30} />);
    const flexGroup = container.querySelector('.euiFlexGroup');
    expect(flexGroup).toHaveStyle(`min-width: 70%`);
  });

  it('does not set negative min-width', () => {
    const { container } = render(<BarDetails item={mockItem} left={150} />);
    const flexGroup = container.querySelector('.euiFlexGroup');
    expect(flexGroup).toHaveStyle(`min-width: 0%`);
  });

  it('applies 8px margin-right to the last EuiFlexItem', () => {
    const { container } = render(<BarDetails item={mockItem} left={10} />);
    const flexItems = container.querySelectorAll('.euiFlexGroup > .euiFlexItem');
    const lastFlexItem = flexItems[flexItems.length - 1];
    expect(window.getComputedStyle(lastFlexItem).marginRight).toBe('8px');
  });

  describe('in case of errors', () => {
    it('renders errors icon in case of errors', () => {
      const mockItemWithError = {
        ...mockItem,
        errors: [{ errorDocId: 'error-doc-id-1' }],
      } as unknown as TraceWaterfallItem;
      const { getByTestId } = render(<BarDetails item={mockItemWithError} left={10} />);
      expect(getByTestId('apmBarDetailsErrorIcon')).toBeInTheDocument();
    });

    describe('and error click event', () => {
      beforeAll(() => {
        (useTraceWaterfallContext as jest.Mock).mockReturnValue({
          onErrorClick: () => {},
        });
      });
      it('renders errors button icont', () => {
        const mockItemWithError = {
          ...mockItem,
          errors: [{ errorDocId: 'error-doc-id-1' }],
        } as unknown as TraceWaterfallItem;
        const { getByTestId } = render(<BarDetails item={mockItemWithError} left={10} />);
        expect(getByTestId('apmBarDetailsErrorBadge')).toBeInTheDocument();
      });
    });

    describe('and related errors href', () => {
      beforeAll(() => {
        (useTraceWaterfallContext as jest.Mock).mockReturnValue({
          getRelatedErrorsHref: () => {},
        });
      });

      describe('and only has 1 error', () => {
        const mockItemWithError = {
          ...mockItem,
          errors: [{ errorDocId: 'error-doc-id-1' }],
        } as unknown as TraceWaterfallItem;

        it('renders errors badge in with the correct string', () => {
          const { getByTestId, getByText } = render(
            <BarDetails item={mockItemWithError} left={10} />
          );
          expect(getByTestId('apmBarDetailsErrorBadge')).toBeInTheDocument();
          expect(getByText('View error')).toBeInTheDocument();
        });
      });

      describe('and has more than 1 error', () => {
        const errorCount = 2;
        const mockItemWithError = {
          ...mockItem,
          errors: [{ errorDocId: 'error-doc-id-1' }, { errorDocId: 'error-doc-id-2' }],
        } as unknown as TraceWaterfallItem;

        it('renders errors badge in with the correct string', () => {
          const { getByTestId, getByText } = render(
            <BarDetails item={mockItemWithError} left={10} />
          );
          expect(getByTestId('apmBarDetailsErrorBadge')).toBeInTheDocument();
          expect(getByText(`View ${errorCount} errors`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('in case of failure or error', () => {
    const mockItemWithFailure = {
      ...mockItem,
      status: {
        fieldName: 'fieldName',
        value: 'Error',
      },
    } as unknown as TraceWaterfallItem;

    it('renders failure badge', () => {
      const { getByTestId } = render(<BarDetails item={mockItemWithFailure} left={10} />);
      const badgeElement = getByTestId('apmBarDetailsFailureBadge');
      expect(badgeElement).toBeInTheDocument();
      expect(badgeElement).toHaveTextContent(mockItemWithFailure.status?.value ?? '');
    });

    it('shows failure badge tooltip on hover', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<BarDetails item={mockItemWithFailure} left={10} />);

      await user.hover(getByTestId('apmBarDetailsFailureBadge'));

      await waitFor(() => {
        const tooltipElement = getByTestId('apmBarDetailsFailureTooltip');
        expect(tooltipElement).toBeInTheDocument();
        expect(tooltipElement).toHaveTextContent(
          `${mockItemWithFailure.status?.fieldName} = ${mockItemWithFailure.status?.value}`
        );
      });
    });
  });

  describe('in case of orphan spans', () => {
    const mockOrphanItem = {
      ...mockItem,
      isOrphan: true,
    } as unknown as TraceWaterfallItem;

    it('renders an orphan span icon', () => {
      const { getByTestId } = render(<BarDetails item={mockOrphanItem} left={10} />);

      const orphanIcon = getByTestId('apmBarDetailsOrphanIcon');

      expect(orphanIcon).toBeInTheDocument();
      expect(orphanIcon).toHaveTextContent('Orphan');
    });

    it('shows a tooltip on hover', async () => {
      const user = userEvent.setup();
      const { getByTestId, getByText } = render(<BarDetails item={mockOrphanItem} left={10} />);

      await user.hover(getByTestId('apmBarDetailsOrphanIcon'));

      await waitFor(() => {
        expect(getByTestId('apmBarDetailsOrphanTooltip')).toBeInTheDocument();

        const tooltipContent = getByText(
          'This span is orphaned due to missing trace context and has been reparented to the root to restore the execution flow'
        );
        expect(tooltipContent).toBeInTheDocument();
      });
    });
  });

  describe('in case of span links', () => {
    it('does not render SpanLinksBadge when both incoming and outgoing counts are zero', () => {
      const mockItemWithNoSpanLinks = {
        ...mockItem,
        id: 'test-span-id',
        spanLinksCount: { incoming: 0, outgoing: 0 },
      } as unknown as TraceWaterfallItem;

      const { queryByTestId } = render(<BarDetails item={mockItemWithNoSpanLinks} left={10} />);
      expect(queryByTestId('spanLinksBadge_test-span-id')).not.toBeInTheDocument();
    });

    it('renders SpanLinksBadge with correct count for single span link', () => {
      const mockItemWithSpanLinks = {
        ...mockItem,
        id: 'test-span-id',
        spanLinksCount: { incoming: 1, outgoing: 0 },
      } as unknown as TraceWaterfallItem;

      const { getByTestId, getByText } = render(
        <BarDetails item={mockItemWithSpanLinks} left={10} />
      );
      const badge = getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(getByText('1 Span link')).toBeInTheDocument();
    });

    it('renders SpanLinksBadge with correct count for multiple span links', () => {
      const mockItemWithSpanLinks = {
        ...mockItem,
        id: 'test-span-id',
        spanLinksCount: { incoming: 2, outgoing: 3 },
      } as unknown as TraceWaterfallItem;

      const { getByTestId, getByText } = render(
        <BarDetails item={mockItemWithSpanLinks} left={10} />
      );
      const badge = getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(getByText('5 Span links')).toBeInTheDocument();
    });

    it('shows tooltip with correct counts on hover', async () => {
      const user = userEvent.setup();
      const mockItemWithSpanLinks = {
        ...mockItem,
        id: 'test-span-id',
        spanLinksCount: { incoming: 3, outgoing: 5 },
      } as unknown as TraceWaterfallItem;

      const { getByTestId, getByText } = render(
        <BarDetails item={mockItemWithSpanLinks} left={10} />
      );
      const badge = getByTestId('spanLinksBadge_test-span-id');

      await user.hover(badge);

      await waitFor(() => {
        expect(getByText('8 Span links found')).toBeInTheDocument();
        expect(getByText('3 incoming')).toBeInTheDocument();
        expect(getByText('5 outgoing')).toBeInTheDocument();
      });
    });
  });

  describe('in case of sync badge', () => {
    it('renders "blocking" badge for nodejs agent with sync=true', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: true,
        agentName: 'nodejs',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('blocking')).toBeInTheDocument();
    });

    it('renders "blocking" badge for rum-js agent with sync=true', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: true,
        agentName: 'rum-js',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('blocking')).toBeInTheDocument();
    });

    it('renders "blocking" badge for js-base agent with sync=true', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: true,
        agentName: 'js-base',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('blocking')).toBeInTheDocument();
    });

    it('renders "async" badge for go agent with sync=false', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: false,
        agentName: 'go',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('async')).toBeInTheDocument();
    });

    it('renders "async" badge for python agent with sync=false', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: false,
        agentName: 'python',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('async')).toBeInTheDocument();
    });

    it('renders "async" badge for php agent with sync=false', () => {
      const mockItemWithSync = {
        ...mockItem,
        sync: false,
        agentName: 'php',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      expect(getByText('async')).toBeInTheDocument();
    });

    it('does not render badge when sync is undefined', () => {
      const mockItemWithoutSync = {
        ...mockItem,
        sync: undefined,
        agentName: 'nodejs',
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithoutSync} left={10} />);
      expect(queryByText('blocking')).not.toBeInTheDocument();
      expect(queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge when agentName is missing', () => {
      const mockItemWithoutAgent = {
        ...mockItem,
        sync: true,
        agentName: undefined,
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithoutAgent} left={10} />);
      expect(queryByText('blocking')).not.toBeInTheDocument();
      expect(queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge for nodejs with sync=false (mismatched condition)', () => {
      const mockItemWithMismatch = {
        ...mockItem,
        sync: false,
        agentName: 'nodejs',
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithMismatch} left={10} />);
      expect(queryByText('blocking')).not.toBeInTheDocument();
      expect(queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge for python with sync=true (mismatched condition)', () => {
      const mockItemWithMismatch = {
        ...mockItem,
        sync: true,
        agentName: 'python',
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithMismatch} left={10} />);
      expect(queryByText('blocking')).not.toBeInTheDocument();
      expect(queryByText('async')).not.toBeInTheDocument();
    });

    it('does not render badge when both sync and agentName are undefined (OTEL without metadata)', () => {
      const mockOtelItem = {
        ...mockItem,
        sync: undefined,
        agentName: undefined,
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockOtelItem} left={10} />);
      expect(queryByText('blocking')).not.toBeInTheDocument();
      expect(queryByText('async')).not.toBeInTheDocument();
    });

    it('shows tooltip on hover for sync badge', async () => {
      const user = userEvent.setup();
      const mockItemWithSync = {
        ...mockItem,
        sync: true,
        agentName: 'nodejs',
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithSync} left={10} />);
      const badge = getByText('blocking');

      await user.hover(badge);

      await waitFor(() => {
        expect(
          getByText('Indicates whether the span was executed synchronously or asynchronously.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('in case of cold start', () => {
    it('renders cold start badge when coldstart is true', () => {
      const mockItemWithColdStart = {
        ...mockItem,
        coldstart: true,
      } as unknown as TraceWaterfallItem;

      const { getByText } = render(<BarDetails item={mockItemWithColdStart} left={10} />);
      expect(getByText('cold start')).toBeInTheDocument();
    });

    it('does not render cold start badge when coldstart is false', () => {
      const mockItemWithColdStart = {
        ...mockItem,
        coldstart: false,
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithColdStart} left={10} />);
      expect(queryByText('cold start')).not.toBeInTheDocument();
    });

    it('does not render cold start badge when coldstart is undefined', () => {
      const mockItemWithColdStart = {
        ...mockItem,
        coldstart: undefined,
      } as unknown as TraceWaterfallItem;

      const { queryByText } = render(<BarDetails item={mockItemWithColdStart} left={10} />);
      expect(queryByText('cold start')).not.toBeInTheDocument();
    });
  });
});
