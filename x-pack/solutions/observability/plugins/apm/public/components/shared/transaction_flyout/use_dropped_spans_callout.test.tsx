/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, renderHook, screen } from '@testing-library/react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useDroppedSpansCallout } from './use_dropped_spans_callout';
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

const renderCallout = (transaction?: Transaction) =>
  renderHook(() => useDroppedSpansCallout(transaction)).result.current;

describe('useDroppedSpansCallout', () => {
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
    const callout = renderCallout(buildTransaction(5));

    expect(callout?.props.level).toBe('info');
    expect(callout?.props['data-test-subj']).toBe('transactionFlyoutDroppedSpansCallout');
    expect(callout?.props.title).toMatch(/dropped 5 spans or more based on its configuration/);

    // A bare `Body.Callout` renders nothing outside the template, so render its link content.
    render(callout?.props.children);
    const link = screen.getByRole('link', {
      name: 'Learn more about dropped spans.',
    });
    expect(link).toHaveAttribute('href', DROPPED_SPANS_DOC_URL);
    expect(link).toHaveAttribute(
      'data-test-subj',
      'apmDroppedSpansWarningLearnMoreAboutDroppedSpansLink'
    );
  });

  it('does not render when dropped is 0', () => {
    expect(renderCallout(buildTransaction(0))).toBeNull();
  });

  it('does not render when span_count is missing', () => {
    expect(renderCallout(buildTransaction())).toBeNull();
  });

  it('does not render when transaction is missing', () => {
    expect(renderCallout({} as Transaction)).toBeNull();
    expect(renderCallout(undefined)).toBeNull();
  });
});
