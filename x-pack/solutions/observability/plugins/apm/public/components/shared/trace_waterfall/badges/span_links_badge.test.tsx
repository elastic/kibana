/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpanLinksBadge } from './span_links_badge';

describe('SpanLinksBadge', () => {
  const defaultProps = {
    id: 'test-span-id',
    incomingCount: 0,
    outgoingCount: 0,
  };

  it('renders null when both incoming and outgoing counts are zero', () => {
    const { container } = render(<SpanLinksBadge {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  describe('when there are span links', () => {
    it('renders badge with correct total count for single span link', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={1} outgoingCount={0} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1 Span link');
    });

    it('renders badge with correct total count for multiple span links', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={2} outgoingCount={3} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5 Span links');
    });

    it('renders badge with only incoming count', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={4} outgoingCount={0} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('4 Span links');
    });

    it('renders badge with only outgoing count', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={0} outgoingCount={3} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3 Span links');
    });
  });

  describe('tooltip', () => {
    it('shows tooltip with correct counts on hover for single link', async () => {
      const user = userEvent.setup();
      render(<SpanLinksBadge {...defaultProps} incomingCount={1} outgoingCount={0} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      await user.hover(badge);

      await waitFor(() => {
        expect(screen.getByText('1 Span link found')).toBeInTheDocument();
        expect(screen.getByText('1 incoming')).toBeInTheDocument();
        expect(screen.getByText('0 outgoing')).toBeInTheDocument();
      });
    });

    it('shows tooltip with correct counts on hover for multiple links', async () => {
      const user = userEvent.setup();
      render(<SpanLinksBadge {...defaultProps} incomingCount={3} outgoingCount={5} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      await user.hover(badge);

      await waitFor(() => {
        expect(screen.getByText('8 Span links found')).toBeInTheDocument();
        expect(screen.getByText('3 incoming')).toBeInTheDocument();
        expect(screen.getByText('5 outgoing')).toBeInTheDocument();
      });
    });

    it('shows tooltip with correct pluralization', async () => {
      const user = userEvent.setup();
      render(<SpanLinksBadge {...defaultProps} incomingCount={1} outgoingCount={1} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      await user.hover(badge);

      await waitFor(() => {
        expect(screen.getByText('2 Span links found')).toBeInTheDocument();
      });
    });
  });

  describe('onClick functionality', () => {
    it('calls onClick handler with correct tab parameter when clicked', async () => {
      const user = userEvent.setup();
      const onClickMock = jest.fn();
      render(
        <SpanLinksBadge
          {...defaultProps}
          incomingCount={1}
          outgoingCount={1}
          onClick={onClickMock}
        />
      );
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      await user.click(badge);

      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(onClickMock).toHaveBeenCalledWith('span_links');
    });

    it('does not add click handlers when onClick is not provided', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={1} outgoingCount={1} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveAttribute('onClick');
    });

    it('has correct aria label when onClick is provided', () => {
      const onClickMock = jest.fn();
      render(
        <SpanLinksBadge
          {...defaultProps}
          incomingCount={1}
          outgoingCount={1}
          onClick={onClickMock}
        />
      );
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      expect(badge).toHaveAttribute('aria-label', 'Open span links details');
    });

    it('does not have aria label when onClick is not provided', () => {
      render(<SpanLinksBadge {...defaultProps} incomingCount={1} outgoingCount={1} />);
      const badge = screen.getByTestId('spanLinksBadge_test-span-id');

      expect(badge).not.toHaveAttribute('aria-label');
    });
  });
});
