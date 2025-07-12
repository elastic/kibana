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
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

jest.mock('../../../../common/utils/formatters', () => ({
  asDuration: (value: number) => `${value} ms`,
}));
jest.mock('./trace_waterfall_context', () => ({
  useTraceWaterfallContext: jest.fn(),
}));

import { useTraceWaterfallContext } from './trace_waterfall_context';

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
  } as unknown as TraceItem;

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
        errorCount: 1,
      } as unknown as TraceItem;
      const { getByTestId } = render(<BarDetails item={mockItemWithError} left={10} />);
      expect(getByTestId('apmBarDetailsErrorIcon')).toBeInTheDocument();
    });

    describe('and error click event', () => {
      it('renders errors button icont', () => {
        const mockItemWithError = {
          name: 'Test Span',
          duration: 1234,
          errorCount: 1,
        } as unknown as TraceItem;
        const { getByTestId } = render(
          <BarDetails item={mockItemWithError} left={10} onErrorClick={() => {}} />
        );
        expect(getByTestId('apmBarDetailsErrorButton')).toBeInTheDocument();
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
          errorCount: 1,
        } as unknown as TraceItem;

        it('renders errors badge in with the correct string', () => {
          const { getByTestId, getByText } = render(
            <BarDetails item={mockItemWithError} left={10} />
          );
          expect(getByTestId('apmBarDetailsErrorBadge')).toBeInTheDocument();
          expect(getByText('View related error')).toBeInTheDocument();
        });
      });

      describe('and has more than 1 error', () => {
        const errorCount = 2;
        const mockItemWithError = {
          name: 'Test Span',
          duration: 1234,
          errorCount,
        } as unknown as TraceItem;

        it('renders errors badge in with the correct string', () => {
          const { getByTestId, getByText } = render(
            <BarDetails item={mockItemWithError} left={10} />
          );
          expect(getByTestId('apmBarDetailsErrorBadge')).toBeInTheDocument();
          expect(getByText(`View ${errorCount} related errors`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('in case of failure', () => {
    const mockItemWithFailure = {
      name: 'Test Span',
      duration: 1234,
      isFailure: true,
    } as unknown as TraceItem;

    it('renders failure badge', () => {
      const { getByTestId } = render(<BarDetails item={mockItemWithFailure} left={10} />);
      expect(getByTestId('apmBarDetailsFailureBadge')).toBeInTheDocument();
    });

    it('shows failure badge tooltip on hover', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<BarDetails item={mockItemWithFailure} left={10} />);

      await user.hover(getByTestId('apmBarDetailsFailureBadge'));

      await waitFor(() => {
        expect(getByTestId('apmBarDetailsFailureTooltip')).toBeInTheDocument();
      });
    });
  });
});
