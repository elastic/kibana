/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SessionReplayThumbnail, extractThumbnailSnapshot } from '../..';
import type { ReplayEvent, ReplayThumbnailSnapshot } from '../..';
import { parseReplayEvents } from '../model/replay_event_guards';
import { formatClock } from '../model/time_format';
import { FIXTURES } from './story_data';
import thumbShopList from '../../fixtures/thumb_shop_list.json';
import thumbCheckout from '../../fixtures/thumb_checkout.json';
import thumbDataTable from '../../fixtures/thumb_data_table.json';
import thumbArticle from '../../fixtures/thumb_article.json';
import thumbErrorPage from '../../fixtures/thumb_error_page.json';

const PAGES: ReadonlyArray<{ name: string; events: ReplayEvent[]; durationMs: number }> = [
  { name: '/products', events: parseReplayEvents(thumbShopList), durationMs: 184_000 },
  { name: '/checkout', events: parseReplayEvents(thumbCheckout), durationMs: 97_000 },
  { name: '/reports/table', events: parseReplayEvents(thumbDataTable), durationMs: 412_000 },
  { name: '/blog/post', events: parseReplayEvents(thumbArticle), durationMs: 63_000 },
  { name: '/error', events: parseReplayEvents(thumbErrorPage), durationMs: 12_000 },
  { name: '/hostile', events: FIXTURES.hostileContent, durationMs: 12_000 },
];

type Outcome = 'ok' | 'missing' | 'fails';

interface Row {
  id: string;
  page: string;
  durationMs: number;
  outcome: Outcome;
  events: ReplayEvent[];
}

const ROWS: Row[] = Array.from({ length: 25 }, (_, position) => {
  const page = PAGES[position % PAGES.length];
  const outcome: Outcome = position === 7 ? 'missing' : position === 12 ? 'fails' : 'ok';
  return {
    id: `session-${position + 1}`,
    page: page.name,
    durationMs: page.durationMs + position * 1_000,
    outcome,
    events: page.events,
  };
});

/** What a host does: fetch the start of the recording, then take the snapshot from it. */
const loadSnapshot = (row: Row): Promise<ReplayThumbnailSnapshot | undefined> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (row.outcome === 'fails') {
        reject(new Error('The first page could not be loaded'));
      } else {
        resolve(row.outcome === 'missing' ? undefined : extractThumbnailSnapshot(row.events));
      }
    }, 150 + Math.random() * 600);
  });

const ThumbnailCell = ({ row }: { row: Row }) => {
  const [snapshot, setSnapshot] = useState<ReplayThumbnailSnapshot>();
  useEffect(() => {
    let cancelled = false;
    loadSnapshot(row)
      .then((loaded) => !cancelled && setSnapshot(loaded))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [row]);
  return (
    <Suspense fallback={null}>
      <SessionReplayThumbnail snapshot={snapshot} data-test-subj={`thumbnail-${row.id}`} />
    </Suspense>
  );
};

const SessionList = () => {
  const rows = useMemo(() => ROWS, []);
  return (
    <div style={{ height: 520, overflowY: 'auto' }} data-test-subj="sessionList">
      {rows.map((row) => (
        <EuiFlexGroup
          key={row.id}
          alignItems="center"
          gutterSize="m"
          responsive={false}
          style={{ padding: 8, borderBottom: '1px solid rgba(128,128,128,0.2)' }}
        >
          <EuiFlexItem grow={false}>
            <ThumbnailCell row={row} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{row.id}</strong> · {row.page}
              <br />
              {formatClock(row.durationMs)} · {row.events.length} events at start
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </div>
  );
};

const meta: Meta = {
  title: 'Observability/Session replay thumbnail',
  parameters: {
    docs: {
      description: {
        component:
          'A still picture of the first frame of a recording, drawn once when it scrolls into view. ' +
          'The snapshot is drawn in the same sandbox as the player and goes through the same URL policy.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const SessionListWithThumbnails: Story = {
  render: () => <SessionList />,
  parameters: {
    docs: {
      description: {
        story:
          '25 rows over six synthetic pages. Row 8 has no recording, row 13 fails to load, and the ' +
          'hostile page shows its first frame with nothing fetched. Scroll to draw the rest.',
      },
    },
  },
};

export const ThumbnailStates: Story = {
  render: () => (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <Suspense fallback={null}>
          <SessionReplayThumbnail />
        </Suspense>
        <EuiText size="xs">No snapshot</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Suspense fallback={null}>
          <SessionReplayThumbnail snapshot={extractThumbnailSnapshot(PAGES[0].events)} />
        </Suspense>
        <EuiText size="xs">Default size</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Suspense fallback={null}>
          <SessionReplayThumbnail
            snapshot={extractThumbnailSnapshot(PAGES[2].events)}
            width={320}
            height={200}
          />
        </Suspense>
        <EuiText size="xs">Large</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};
