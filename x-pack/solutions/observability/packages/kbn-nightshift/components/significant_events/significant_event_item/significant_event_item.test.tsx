/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { SignificantEventItem, type SignificantEventItemProps } from './significant_event_item';

const renderItem = (props: Partial<SignificantEventItemProps> = {}) => {
  const fullProps: SignificantEventItemProps = {
    title: 'Intermittent login failures on userportal.net',
    summary: 'Our authentication system is timing out under load',
    detectedAt: '2026-06-28T08:00:00.000Z',
    formatDetectedAt: () => '15 minutes ago',
    status: { label: 'Take an action', color: 'danger' },
    ...props,
  };
  return render(
    <I18nProvider>
      <SignificantEventItem {...fullProps} />
    </I18nProvider>
  );
};

describe('SignificantEventItem', () => {
  it('renders title, summary, formatted timestamp and status label', () => {
    renderItem();

    expect(screen.getByText('Intermittent login failures on userportal.net')).toBeInTheDocument();
    expect(
      screen.getByText('Our authentication system is timing out under load')
    ).toBeInTheDocument();
    expect(screen.getByText('15 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('Take an action')).toBeInTheDocument();
  });

  it('renders a real <button> trigger when onClick is provided', () => {
    renderItem({ onClick: jest.fn() });
    const trigger = screen.getByTestId('significantEventItem-trigger');
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('renders a non-interactive <div> trigger when no onClick is provided', () => {
    renderItem();
    const trigger = screen.getByTestId('significantEventItem-trigger');
    expect(trigger.tagName).toBe('DIV');
  });

  it('exposes aria-expanded on the trigger button reflecting `selected`', () => {
    const { rerender } = render(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
          onClick={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventItem-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    rerender(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
          selected
          onClick={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('significantEventItem-trigger')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('wires `controls` to aria-controls on the trigger', () => {
    renderItem({ onClick: jest.fn(), controls: 'my-flyout-id' });
    expect(screen.getByTestId('significantEventItem-trigger')).toHaveAttribute(
      'aria-controls',
      'my-flyout-id'
    );
  });

  it("uses aria-labelledby pointing to the title so the trigger's accessible name is the title", () => {
    renderItem({ onClick: jest.fn() });
    const trigger = screen.getByRole('button', {
      name: 'Intermittent login failures on userportal.net',
    });
    expect(trigger).toHaveAttribute('aria-labelledby');
  });

  it('fires onClick when the trigger button is clicked', () => {
    const onClick = jest.fn();
    renderItem({ onClick });
    fireEvent.click(screen.getByTestId('significantEventItem-trigger'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('left icon reflects selected state visually (expand <-> minimize)', () => {
    const { rerender } = render(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
          onClick={jest.fn()}
          data-test-subj="row"
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('row-leftIcon')).toHaveAttribute('data-euiicon-type', 'expand');

    rerender(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
          selected
          onClick={jest.fn()}
          data-test-subj="row"
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('row-leftIcon')).toHaveAttribute('data-euiicon-type', 'minimize');
  });

  it('renders Start a chat and More buttons only when their handlers are provided', () => {
    const { rerender } = render(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
        />
      </I18nProvider>
    );

    expect(screen.queryByTestId('significantEventItem-startChat')).not.toBeInTheDocument();
    expect(screen.queryByTestId('significantEventItem-more')).not.toBeInTheDocument();

    const onStartChat = jest.fn();
    const onMoreClick = jest.fn();

    rerender(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt="2026-06-28T08:00:00.000Z"
          formatDetectedAt={() => 'now'}
          status={{ label: 'x', color: 'danger' }}
          onClick={jest.fn()}
          onStartChat={onStartChat}
          onMoreClick={onMoreClick}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('significantEventItem-startChat'));
    expect(onStartChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('significantEventItem-more'));
    expect(onMoreClick).toHaveBeenCalledTimes(1);
    expect(onMoreClick.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });

  it('uses startChatLabel and moreActionsAriaLabel props when provided', () => {
    renderItem({
      onClick: jest.fn(),
      onStartChat: jest.fn(),
      onMoreClick: jest.fn(),
      startChatLabel: 'Discuter',
      moreActionsAriaLabel: 'Plus d’actions',
    });

    expect(screen.getByTestId('significantEventItem-startChat')).toHaveTextContent('Discuter');
    expect(screen.getByTestId('significantEventItem-more')).toHaveAttribute(
      'aria-label',
      'Plus d’actions'
    );
  });

  it('action buttons are siblings of the trigger button (no nested interactive elements)', () => {
    renderItem({
      onClick: jest.fn(),
      onStartChat: jest.fn(),
      onMoreClick: jest.fn(),
    });

    const trigger = screen.getByTestId('significantEventItem-trigger');
    const chat = screen.getByTestId('significantEventItem-startChat');
    const more = screen.getByTestId('significantEventItem-more');

    expect(trigger.contains(chat)).toBe(false);
    expect(trigger.contains(more)).toBe(false);
  });

  it('renders skeletons when `loading` is true and hides action buttons', () => {
    renderItem({
      loading: true,
      onClick: jest.fn(),
      onStartChat: jest.fn(),
      onMoreClick: jest.fn(),
    });

    expect(screen.getByTestId('significantEventItem-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventItem-startChat')).not.toBeInTheDocument();
    expect(screen.queryByTestId('significantEventItem-more')).not.toBeInTheDocument();
    // Real content is replaced by skeletons:
    expect(
      screen.queryByText('Intermittent login failures on userportal.net')
    ).not.toBeInTheDocument();
  });

  it('uses FormattedRelative by default (asserted by absence of formatDetectedAt prop)', () => {
    // Sanity check: when no override is provided, the relative time text node
    // is still produced (FormattedRelative renders an updating string). We
    // don't assert the exact value (locale-dependent) — only that something
    // non-empty renders next to the bullet.
    const detectedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <I18nProvider>
        <SignificantEventItem
          title="t"
          summary="s"
          detectedAt={detectedAt}
          status={{ label: 'x', color: 'danger' }}
        />
      </I18nProvider>
    );
    // Look for "ago" / "minute" in the rendered tree — FormattedRelative output.
    expect(screen.getByText(/ago|minute|second|now/i)).toBeInTheDocument();
  });
});
