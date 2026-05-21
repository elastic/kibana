/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { DroppedSpansWarning } from './dropped_spans_warning';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

jest.mock('../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const DROPPED_SPANS_DOC_URL = 'https://example.com/dropped-spans';

const buildTransaction = (dropped?: number): Transaction =>
  ({
    transaction: {
      span_count: dropped === undefined ? undefined : { dropped },
    },
  } as Transaction);

describe('DroppedSpansWarning', () => {
  beforeEach(() => {
    mockUseApmPluginContext.mockReturnValue({
      core: {
        docLinks: {
          links: {
            apm: {
              droppedTransactionSpans: DROPPED_SPANS_DOC_URL,
            },
          },
        },
      },
    } as any);
  });

  it('renders the callout with the dropped count and a docs link when there are dropped spans', () => {
    render(<DroppedSpansWarning transactionDoc={buildTransaction(5)} />);

    expect(
      screen.getByText(/dropped 5 spans or more based on its configuration/)
    ).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: 'Learn more about dropped spans.',
    });
    expect(link).toHaveAttribute('href', DROPPED_SPANS_DOC_URL);
  });

  it('does not render when dropped is 0', () => {
    const { container } = render(<DroppedSpansWarning transactionDoc={buildTransaction(0)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when span_count is missing', () => {
    const { container } = render(<DroppedSpansWarning transactionDoc={buildTransaction()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when transaction is missing', () => {
    const { container } = render(<DroppedSpansWarning transactionDoc={{} as Transaction} />);
    expect(container).toBeEmptyDOMElement();
  });
});
