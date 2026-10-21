/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, forwardRef, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { SessionReplayPlayer, deriveReplayMarkers } from '../..';
import type { ReplayEvent, ReplayMarker, ReplayRecording, SessionReplayPlayerHandle } from '../..';
import { parseReplayEvents } from '../model/replay_event_guards';
import { createInMemoryLoader } from '../test_helpers/in_memory_loader';
import type { InMemoryLoaderOptions } from '../test_helpers/in_memory_loader';
import checkoutFlow from '../../fixtures/checkout_flow.json';
import longSession from '../../fixtures/long_session.json';
import focusAndInput from '../../fixtures/focus_and_input.json';
import canvasChart from '../../fixtures/canvas_chart.json';
import canvasCommands from '../../fixtures/canvas_commands.json';
import hostileContent from '../../fixtures/hostile_content.json';

export const FIXTURES = {
  checkoutFlow: parseReplayEvents(checkoutFlow),
  longSession: parseReplayEvents(longSession),
  focusAndInput: parseReplayEvents(focusAndInput),
  canvasChart: parseReplayEvents(canvasChart),
  canvasCommands: parseReplayEvents(canvasCommands),
  hostileContent: parseReplayEvents(hostileContent),
} as const;

/** Events without a full snapshot, which the player cannot show. */
export const withoutSnapshot = (events: readonly ReplayEvent[]): ReplayEvent[] =>
  events.filter(({ type }) => type !== 2);

/** Markers an error would add on top of those derived from the events. */
export const markersWithError = (events: readonly ReplayEvent[]): ReplayMarker[] => {
  const derived = deriveReplayMarkers(events);
  const last = events[events.length - 1];
  const first = events[0];
  return [
    ...derived,
    {
      id: 'error-1',
      kind: 'error',
      timestamp: first.timestamp + (last.timestamp - first.timestamp) * 0.6,
      label: 'TypeError: cannot read properties of undefined',
    },
  ];
};

/** More markers than the timeline has room for, to show how they merge. */
export const denseMarkers = (events: readonly ReplayEvent[], count = 300): ReplayMarker[] => {
  const first = events[0].timestamp;
  const span = events[events.length - 1].timestamp - first;
  return Array.from({ length: count }, (_, position) => ({
    id: `dense-${position}`,
    kind: position % 97 === 0 ? 'error' : position % 11 === 0 ? 'navigation' : 'click',
    timestamp: first + Math.round((span * position) / count),
    label: `Event ${position}`,
  }));
};

export interface ReplayStoryProps
  extends Omit<ComponentProps<typeof SessionReplayPlayer>, 'recording' | 'sessionId'> {
  events: readonly ReplayEvent[];
  sessionId?: string;
  loader?: InMemoryLoaderOptions;
  /** Tell the player how long the recording is before it has loaded. */
  withMeta?: boolean;
  children?: ReactNode;
}

/** The player over a fixture, loaded the way a host would: page by page through a loader. */
export const ReplayStory = forwardRef<SessionReplayPlayerHandle, ReplayStoryProps>(
  function ReplayStory(
    {
      events,
      sessionId = 'story-session',
      loader = { pageSize: 1_000 },
      withMeta = false,
      ...props
    },
    ref
  ) {
    const recording = useMemo<ReplayRecording>(() => {
      const { loadEvents } = createInMemoryLoader(events, loader);
      return {
        status: 'available',
        loadEvents,
        meta: withMeta
          ? {
              startTimestamp: events[0].timestamp,
              endTimestamp: events[events.length - 1].timestamp,
            }
          : undefined,
      };
      // A new loader per mount keeps failure scenarios repeatable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, withMeta]);

    return (
      <Suspense fallback={null}>
        <SessionReplayPlayer
          ref={ref}
          sessionId={sessionId}
          recording={recording}
          markers={props.markers ?? deriveReplayMarkers(events)}
          {...props}
        />
      </Suspense>
    );
  }
);

/** Gives the player the size a host would: it fills its parent. */
export const Frame = ({
  width = '100%',
  height = 640,
  children,
}: {
  width?: number | string;
  height?: number | string;
  children: ReactNode;
}) => <div style={{ width, height, border: '1px solid #d3dae6' }}>{children}</div>;
