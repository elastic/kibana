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
import { SignificantEventList, type SignificantEventListItem } from './significant_event_list';

const TITLE = 'Intermittent login failures on userportal.net';
const SUMMARY = 'Our authentication system is timing out under load';

/**
 * Detection times pegged at 15 minutes before now so the component's
 * default relative-time formatter renders "15 minutes ago" for real.
 */
const FIFTEEN_MINUTES_AGO = new Date(Date.now() - 15 * 60 * 1000).toISOString();

const buildItems = (count: number): SignificantEventListItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `event-${index + 1}`,
    title: TITLE,
    summary: SUMMARY,
    detectedAt: FIFTEEN_MINUTES_AGO,
    status:
      index === 2
        ? { label: 'Investigating', color: 'warning' }
        : { label: 'Take an action', color: 'danger' },
  }));

const meta: Meta<typeof SignificantEventList> = {
  title: 'app/Nightshift/Significant events/SignificantEventList',
  component: SignificantEventList,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SignificantEventList>;

/**
 * Shared render helper: every list story uses the same select +
 * push-flyout pattern, the only thing that varies is how many items
 * are rendered. Keeping the interaction identical across stories
 * makes the placement / count behaviour easy to compare side-by-side.
 */
function ListWithFlyout({ count }: { count: number }) {
  const items = buildItems(count);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flyoutTitleId = useGeneratedHtmlId();
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <>
      <SignificantEventList
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStartChat={action('start chat')}
        onMoreClick={action('more click')}
      />

      {selected && (
        <EuiFlyout
          type="push"
          size="s"
          onClose={() => setSelectedId(null)}
          aria-labelledby={flyoutTitleId}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{selected.title}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              Detected <FormattedRelative value={selected.detectedAt} />
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>{selected.summary}</p>
              <p>Event-specific evidence, recommendations and impacted KIs would render here.</p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

/**
 * Single item — all four corners rounded.
 */
export const OneItem: Story = {
  name: '1 item',
  render: () => <ListWithFlyout count={1} />,
};

/**
 * Two items — only top + bottom variants are used.
 */
export const TwoItems: Story = {
  name: '2 items',
  render: () => <ListWithFlyout count={2} />,
};

/**
 * Eight items — top + middle×6 + bottom. The canonical demo for the
 * full pattern.
 */
export const EightItems: Story = {
  name: '8 items',
  render: () => <ListWithFlyout count={8} />,
};
