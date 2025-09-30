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
  } as unknown as TraceWaterfallItem;

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
        name: 'Test Span',
        duration: 1234,
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
          name: 'Test Span',
          duration: 1234,
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
          name: 'Test Span',
          duration: 1234,
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
          name: 'Test Span',
          duration: 1234,
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
      name: 'Test Span',
      duration: 1234,
      status: {
        fieldName: 'fieldName',
        value: 'Error',
      },
      errors: [],
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
      name: 'Test Span',
      duration: 1234,
      isOrphan: true,
      errors: [],
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
});
