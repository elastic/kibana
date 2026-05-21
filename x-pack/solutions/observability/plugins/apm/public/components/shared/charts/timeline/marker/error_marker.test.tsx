/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ReactNode } from 'react';
import { fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { renderWithTheme } from '../../../../../utils/test_helpers';
import { ErrorMarker, type ErrorMark } from './error_marker';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter
      initialEntries={[
        '/services/{serviceName}/errors?comparisonEnabled=false&latencyAggregationType=avg&offset=1d&rangeFrom=now-15m&rangeTo=now&serviceGroup=&transactionType=request',
      ]}
    >
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const baseMark = {
  id: 'mark-1',
  offset: 10_000,
  type: 'errorMark',
  verticalLine: true,
  serviceColor: '#ff0000',
  error: {
    trace: { id: 'trace-123' },
    transaction: { id: 'tx-456' },
    error: {
      grouping_key: 'group-abc',
      log: { message: 'Something went wrong' },
    },
    service: { name: 'my-service' },
  },
} as unknown as ErrorMark;

const query = {
  comparisonEnabled: false,
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  serviceGroup: '',
} as any;

function renderMarker(mark: ErrorMark, q: typeof query | undefined = undefined) {
  return renderWithTheme(<ErrorMarker mark={mark} query={q} />, { wrapper: Wrapper });
}

function openPopover(component: ReturnType<typeof renderMarker>) {
  act(() => {
    fireEvent.click(component.getByTestId('popover'));
  });
}

describe('ErrorMarker', () => {
  it('opens a popover with offset and service name when the legend is clicked', () => {
    const component = renderMarker(baseMark);

    expect(component.queryByText('10 ms')).not.toBeInTheDocument();

    openPopover(component);

    expect(component.getByText('10 ms')).toBeInTheDocument();
    expect(component.getByText('my-service')).toBeInTheDocument();
  });

  describe('when onClick is provided', () => {
    it('renders a button and invokes onClick when clicked', () => {
      const onClick = jest.fn();
      const mark = { ...baseMark, onClick } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      const button = component.getByTestId('apmTimelineErrorMarkerButton');
      expect(button).toHaveTextContent('Something went wrong');

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not render the error link even if grouping_key and query are present', () => {
      const mark = { ...baseMark, onClick: jest.fn() } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      expect(component.queryByTestId('errorLink')).not.toBeInTheDocument();
    });
  });

  describe('when onClick is not provided', () => {
    it('renders the ErrorLink when grouping_key and query are present', () => {
      const component = renderMarker(baseMark, query);
      openPopover(component);

      const link = component.getByTestId('errorLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Something went wrong');
    });

    it('renders plain text when query is missing', () => {
      const component = renderMarker(baseMark, undefined);
      openPopover(component);

      expect(component.queryByTestId('errorLink')).not.toBeInTheDocument();
      expect(component.queryByTestId('apmTimelineErrorMarkerButton')).not.toBeInTheDocument();
      expect(component.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders plain text when grouping_key is missing', () => {
      const mark = {
        ...baseMark,
        error: {
          ...baseMark.error,
          error: { log: { message: 'Something went wrong' } },
        },
      } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      expect(component.queryByTestId('errorLink')).not.toBeInTheDocument();
      expect(component.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('error message resolution', () => {
    it('uses error.log.message when present', () => {
      const component = renderMarker(baseMark, query);
      openPopover(component);

      expect(component.getByTestId('errorLink')).toHaveTextContent('Something went wrong');
    });

    it('falls back to error.exception.message when log.message is missing', () => {
      const mark = {
        ...baseMark,
        error: {
          ...baseMark.error,
          error: {
            grouping_key: 'group-abc',
            exception: { message: 'Exception occurred' },
          },
        },
      } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      expect(component.getByTestId('errorLink')).toHaveTextContent('Exception occurred');
    });

    it('truncates error messages longer than 240 characters and appends an ellipsis', () => {
      const longMessage = 'a'.repeat(300);
      const mark = {
        ...baseMark,
        error: {
          ...baseMark.error,
          error: {
            grouping_key: 'group-abc',
            log: { message: longMessage },
          },
        },
      } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      const link = component.getByTestId('errorLink');
      // 240 chars + 1 ellipsis character
      expect(link.textContent).toHaveLength(241);
      expect(link.textContent?.endsWith('…')).toBe(true);
    });

    it('does not truncate messages that are 240 characters or fewer', () => {
      const shortMessage = 'short error message';
      const mark = {
        ...baseMark,
        error: {
          ...baseMark.error,
          error: {
            grouping_key: 'group-abc',
            log: { message: shortMessage },
          },
        },
      } as ErrorMark;

      const component = renderMarker(mark, query);
      openPopover(component);

      expect(component.getByTestId('errorLink')).toHaveTextContent(shortMessage);
    });
  });
});
