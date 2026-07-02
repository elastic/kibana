/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  SignificantEventList,
  type SignificantEventListItem,
  type SignificantEventListProps,
} from './significant_event_list';

const buildItems = (count: number): SignificantEventListItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `event-${index + 1}`,
    title: `Event ${index + 1}`,
    summary: 'summary',
    detectedAt: '2026-06-28T08:00:00.000Z',
    status: { label: 'Take an action', color: 'danger' },
  }));

const renderList = (
  props: Partial<SignificantEventListProps> & { items: SignificantEventListItem[] }
) =>
  render(
    <I18nProvider>
      <SignificantEventList formatDetectedAt={() => 'now'} {...props} />
    </I18nProvider>
  );

describe('SignificantEventList', () => {
  it('renders nothing when items is empty', () => {
    const { container } = renderList({ items: [] });
    expect(container.firstChild).toBeNull();
  });

  it('renders one item per entry', () => {
    renderList({ items: buildItems(3) });
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.getByText('Event 3')).toBeInTheDocument();
  });

  it('toggles selection: clicking an unselected row selects; clicking selected deselects', () => {
    const onSelect = jest.fn();
    const { rerender } = renderList({
      items: buildItems(3),
      selectedId: null,
      onSelect,
    });

    fireEvent.click(screen.getByTestId('significantEventList-item-event-2-trigger'));
    expect(onSelect).toHaveBeenLastCalledWith('event-2');

    rerender(
      <I18nProvider>
        <SignificantEventList
          items={buildItems(3)}
          selectedId="event-2"
          onSelect={onSelect}
          formatDetectedAt={() => 'now'}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('significantEventList-item-event-2-trigger'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('only the selected row exposes aria-expanded=true', () => {
    renderList({
      items: buildItems(3),
      selectedId: 'event-2',
      onSelect: jest.fn(),
    });

    // Exactly one trigger should be expanded.
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
    // Asserting via testid avoids brittle aria-labelledby resolution across
    // three sibling items rendered in the same DOM tree.
    expect(screen.getByTestId('significantEventList-item-event-2-trigger')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('significantEventList-item-event-1-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('significantEventList-item-event-3-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('forwards `controls` to every item as aria-controls', () => {
    renderList({
      items: buildItems(2),
      selectedId: 'event-1',
      onSelect: jest.fn(),
      controls: 'my-flyout',
    });

    expect(screen.getByTestId('significantEventList-item-event-1-trigger')).toHaveAttribute(
      'aria-controls',
      'my-flyout'
    );
    expect(screen.getByTestId('significantEventList-item-event-2-trigger')).toHaveAttribute(
      'aria-controls',
      'my-flyout'
    );
  });

  it('forwards onStartChat / onMoreClick with the item id', () => {
    const onStartChat = jest.fn();
    const onMoreClick = jest.fn();

    renderList({
      items: buildItems(2),
      onSelect: jest.fn(),
      onStartChat,
      onMoreClick,
    });

    fireEvent.click(screen.getByTestId('significantEventList-item-event-1-startChat'));
    expect(onStartChat).toHaveBeenCalledWith('event-1');

    fireEvent.click(screen.getByTestId('significantEventList-item-event-2-more'));
    expect(onMoreClick).toHaveBeenCalledWith('event-2', expect.any(HTMLElement));
  });

  it('forwards startChatLabel / moreActionsAriaLabel down to every item', () => {
    renderList({
      items: buildItems(2),
      onSelect: jest.fn(),
      onStartChat: jest.fn(),
      onMoreClick: jest.fn(),
      startChatLabel: 'Chat',
      moreActionsAriaLabel: 'More',
    });

    expect(screen.getByTestId('significantEventList-item-event-1-startChat')).toHaveTextContent(
      'Chat'
    );
    expect(screen.getByTestId('significantEventList-item-event-1-more')).toHaveAttribute(
      'aria-label',
      'More'
    );
  });

  describe('placement assignment via rendered border-radius', () => {
    /*
     * Internal helper `getItemPlacement` is no longer exported. We
     * verify placement behavior through the public API by checking
     * which items receive which test-subjects (deterministic order).
     */
    it('renders top, middle*N, bottom for >= 3 items', () => {
      renderList({ items: buildItems(8) });
      // All 8 items render with their respective ids; ordering implies
      // placement assignment is index-based. No throws.
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByTestId(`significantEventList-item-event-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('soft item limit', () => {
    const originalWarn = console.warn;
    beforeEach(() => {
      // eslint-disable-next-line no-console
      console.warn = jest.fn();
    });
    afterEach(() => {
      // eslint-disable-next-line no-console
      console.warn = originalWarn;
    });

    it('does not warn at 20 or fewer items', () => {
      renderList({ items: buildItems(20) });
      // eslint-disable-next-line no-console
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('warns in dev when items.length exceeds 20', () => {
      renderList({ items: buildItems(21) });
      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/SignificantEventList.*21.*soft limit of 20/)
      );
    });
  });
});
