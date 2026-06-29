/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { SignificantEventItem, type SignificantEventItemProps } from './significant_event_item';

/**
 * Detection time = 15 minutes before now. We pass a real ISO string so
 * the component's default relative-time formatter renders "15 minutes
 * ago" for real, exercising the same code path the consuming app will.
 */
const FIFTEEN_MINUTES_AGO = new Date(Date.now() - 15 * 60 * 1000).toISOString();

const baseArgs: SignificantEventItemProps = {
  title: 'Intermittent login failures on userportal.net',
  summary: 'Our authentication system is timing out under load',
  detectedAt: FIFTEEN_MINUTES_AGO,
  status: { label: 'Take an action', color: 'danger' },
  placement: 'single',
};

const meta: Meta<typeof SignificantEventItem> = {
  title: 'app/Nightshift/Significant events/SignificantEventItem',
  component: SignificantEventItem,
  args: baseArgs,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 760 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SignificantEventItem>;

export const Default: Story = {
  args: { onClick: action('row click') },
};

export const Selected: Story = {
  args: { selected: true, onClick: action('row click') },
};

/**
 * Hover-state preview: the actions are revealed by CSS `:hover`, so
 * the visual cannot be forced in a static story. Mouse over the row
 * to see the "Start a chat" + overflow icon appear.
 */
export const HoverShowsActions: Story = {
  args: {
    onClick: action('row click'),
    onStartChat: action('start chat'),
    onMoreClick: action('more click'),
  },
};

export const SelectedShowsActions: Story = {
  args: {
    selected: true,
    onClick: action('row click'),
    onStartChat: action('start chat'),
    onMoreClick: action('more click'),
  },
};

/**
 * Demonstrates the controlled selection + flyout pattern with `useState`.
 */
function InteractiveExample(args: SignificantEventItemProps) {
  const [selected, setSelected] = useState(false);
  return (
    <SignificantEventItem
      {...args}
      selected={selected}
      onClick={() => setSelected((prev) => !prev)}
      onStartChat={action('start chat')}
      onMoreClick={action('more click')}
    />
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveExample {...args} />,
};

/**
 * Canonical end-to-end demo: clicking the row marks it selected (left
 * icon switches to `minimize`, background goes primary) and opens a
 * push flyout with the event details. Click again or close the flyout
 * to deselect. This is the pattern engineers should follow in the
 * consuming plugin.
 */
function WithFlyoutExample(args: SignificantEventItemProps) {
  const [open, setOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <>
      <SignificantEventItem
        {...args}
        selected={open}
        onClick={() => setOpen((prev) => !prev)}
        onStartChat={action('start chat')}
        onMoreClick={action('more click')}
      />

      {open && (
        <EuiFlyout
          type="push"
          size="s"
          onClose={() => setOpen(false)}
          aria-labelledby={flyoutTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{args.title}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              Detected <FormattedRelative value={args.detectedAt} />
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>{args.summary}</p>
              <p>Event-specific evidence, recommendations and impacted KIs would render here.</p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

export const WithFlyout: Story = {
  render: (args) => <WithFlyoutExample {...args} />,
};

export const PlacementTop: Story = {
  name: 'Placement / top',
  args: { placement: 'top', onClick: action('row click') },
};

export const PlacementMiddle: Story = {
  name: 'Placement / middle',
  args: { placement: 'middle', onClick: action('row click') },
};

export const PlacementBottom: Story = {
  name: 'Placement / bottom',
  args: { placement: 'bottom', onClick: action('row click') },
};

export const StatusInvestigating: Story = {
  name: 'Status / investigating',
  args: {
    status: { label: 'Investigating', color: 'warning' },
    onClick: action('row click'),
  },
};

export const StatusResolved: Story = {
  name: 'Status / resolved',
  args: {
    status: { label: 'Resolved', color: 'success' },
    onClick: action('row click'),
  },
};

/**
 * Skeleton placeholder rendered in the same container with the same
 * layout slots (icon, title, meta). Use this while fetching event
 * data so the row size doesn't jump when content arrives. Action
 * buttons are not rendered while loading.
 */
export const Loading: Story = {
  args: { loading: true },
};

/**
 * Demonstrates the canonical loading → loaded transition. Click
 * "Toggle loading" to flip between the two states.
 */
function LoadingTransitionExample(args: SignificantEventItemProps) {
  const [loading, setLoading] = useState(true);
  return (
    <>
      <button
        type="button"
        onClick={() => setLoading((prev) => !prev)}
        style={{ marginBottom: 12 }}
      >
        Toggle loading (currently {String(loading)})
      </button>
      <SignificantEventItem {...args} loading={loading} onClick={action('row click')} />
    </>
  );
}

export const LoadingTransition: Story = {
  name: 'Loading / transition',
  render: (args) => <LoadingTransitionExample {...args} />,
};
