/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { ReplayEvent, ReplayMarker } from '../types';

const MAX_LABEL_LENGTH = 64;

const labelForHref = (href: string): string => {
  try {
    const { pathname, search } = new URL(href);
    return `${pathname}${search}` || '/';
  } catch {
    return href.length > MAX_LABEL_LENGTH ? `${href.slice(0, MAX_LABEL_LENGTH - 1)}…` : href;
  }
};

/**
 * Derives basic markers from the recording itself: a navigation for each viewport event whose page
 * address differs from the previous one, and a click for each recorded click. Single-page route
 * changes do not produce viewport events, so a host's own timeline data stays the primary source.
 */
export const deriveReplayMarkers = (events: readonly ReplayEvent[]): ReplayMarker[] => {
  const markers: ReplayMarker[] = [];
  let lastHref: string | undefined;

  events.forEach((event, position) => {
    if (event.type === EventType.Meta) {
      const { href } = event.data;
      if (href && href !== lastHref) {
        markers.push({
          id: `navigation-${event.timestamp}-${position}`,
          kind: 'navigation',
          timestamp: event.timestamp,
          label: labelForHref(href),
        });
      }
      lastHref = href;
      return;
    }
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.MouseInteraction &&
      event.data.type === MouseInteractions.Click
    ) {
      markers.push({
        id: `click-${event.timestamp}-${position}`,
        kind: 'click',
        timestamp: event.timestamp,
        label: 'Click',
      });
    }
  });

  return markers;
};
