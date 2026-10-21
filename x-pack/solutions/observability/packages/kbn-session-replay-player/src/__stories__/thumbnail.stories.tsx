/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SessionReplayThumbnail, extractThumbnailSnapshot } from '../..';
import type { ReplayEvent, ReplayThumbnailSnapshot } from '../..';
import { parseReplayEvents } from '../model/replay_event_guards';
import { formatClock } from '../model/time_format';
import { withStoryInfo } from './story_info';
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

const buildRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, position) => {
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
const loadSnapshot = (row: Row, latencyMs: number): Promise<ReplayThumbnailSnapshot | undefined> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (row.outcome === 'fails') {
        reject(new Error('The first page could not be loaded'));
      } else {
        resolve(row.outcome === 'missing' ? undefined : extractThumbnailSnapshot(row.events));
      }
    }, latencyMs * (0.75 + Math.random() * 0.5));
  });

const ThumbnailCell = ({
  row,
  latencyMs,
  onFetched,
}: {
  row: Row;
  latencyMs: number;
  onFetched: () => void;
}) => {
  const [snapshot, setSnapshot] = useState<ReplayThumbnailSnapshot>();
  useEffect(() => {
    let cancelled = false;
    loadSnapshot(row, latencyMs)
      .then((loaded) => {
        if (!cancelled) {
          setSnapshot(loaded);
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && onFetched());
    return () => {
      cancelled = true;
    };
    // The list is remounted when the controls change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Suspense fallback={null}>
      <SessionReplayThumbnail snapshot={snapshot} data-test-subj={`thumbnail-${row.id}`} />
    </Suspense>
  );
};

interface ListArgs {
  rows: number;
  latencyMs: number;
}

const SessionList = ({ rows: rowCount, latencyMs }: ListArgs) => {
  const rows = useMemo(() => buildRows(rowCount), [rowCount]);
  const [fetched, setFetched] = useState(0);
  const [drawn, setDrawn] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(
      () => setDrawn(listRef.current?.querySelectorAll('[data-state=drawn]').length ?? 0),
      250
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <EuiText size="xs" data-test-subj="sessionListStatus">
        Rows: {rows.length} · snapshots fetched: {fetched} · thumbnails drawn: {drawn}
      </EuiText>
      <div ref={listRef} style={{ height: 520, overflowY: 'auto' }} data-test-subj="sessionList">
        {rows.map((row) => (
          <EuiFlexGroup
            key={row.id}
            alignItems="center"
            gutterSize="m"
            responsive={false}
            style={{ padding: 8, borderBottom: '1px solid rgba(128,128,128,0.2)' }}
          >
            <EuiFlexItem grow={false}>
              <ThumbnailCell
                row={row}
                latencyMs={latencyMs}
                onFetched={() => setFetched((count) => count + 1)}
              />
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
    </>
  );
};

const meta: Meta = {
  title: 'Observability/Session replay thumbnail',
  decorators: [withStoryInfo],
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

export const SessionListWithThumbnails: StoryObj<ListArgs> = {
  args: { rows: 25, latencyMs: 400 },
  argTypes: {
    rows: { control: 'select', options: [25, 100, 500] },
    latencyMs: {
      name: 'latencyMs (fetch latency)',
      control: 'select',
      options: [0, 400, 2_000, 6_000],
    },
  },
  // The list restarts when a control changes so every row fetches again.
  render: (args) => <SessionList key={`${args.rows}-${args.latencyMs}`} {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'Rows over six synthetic pages. Row 8 has no recording, row 13 fails to load, and the ' +
          'hostile page shows its first frame with nothing fetched. Use the controls to make the ' +
          'list longer or the fetches slower, and scroll to draw the rest.',
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
