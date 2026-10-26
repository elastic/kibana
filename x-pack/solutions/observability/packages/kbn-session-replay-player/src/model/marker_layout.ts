/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayMarker, ReplayMarkerKind } from '../types';

/** Highest priority first, so an error is never hidden behind a click. */
const MARKER_PRIORITY: readonly ReplayMarkerKind[] = ['error', 'navigation', 'click'];

/** Markers this close to the recording's edges are clamped onto it; clock skew between sources. */
export const MARKER_CLAMP_TOLERANCE_MS = 1_000;
export const MIN_MARKER_SPACING_PX = 8;

export interface MarkerBucket {
  readonly id: string;
  /** Offset of the earliest marker in the bucket, the target when the bucket is activated. */
  readonly offsetMs: number;
  readonly positionPx: number;
  /** The highest-priority kind among the bucket's markers. */
  readonly kind: ReplayMarkerKind;
  readonly markers: readonly ReplayMarker[];
}

interface PositionedMarker {
  readonly marker: ReplayMarker;
  readonly offsetMs: number;
}

const priorityOf = (kind: ReplayMarkerKind): number => MARKER_PRIORITY.indexOf(kind);

const highestPriorityKind = (markers: readonly ReplayMarker[]): ReplayMarkerKind =>
  markers.reduce<ReplayMarkerKind>(
    (best, { kind }) => (priorityOf(kind) < priorityOf(best) ? kind : best),
    markers[0].kind
  );

/**
 * Places markers on the timeline and groups those that would sit closer than `minSpacingPx` into
 * one bucket, so a dense recording stays readable without dropping any marker.
 */
export const layoutMarkers = (
  markers: readonly ReplayMarker[],
  {
    startTimestamp,
    endTimestamp,
    widthPx,
    minSpacingPx = MIN_MARKER_SPACING_PX,
    toleranceMs = MARKER_CLAMP_TOLERANCE_MS,
  }: {
    startTimestamp: number;
    endTimestamp: number;
    widthPx: number;
    minSpacingPx?: number;
    toleranceMs?: number;
  }
): MarkerBucket[] => {
  const durationMs = endTimestamp - startTimestamp;
  if (!(durationMs > 0) || !(widthPx > 0)) {
    return [];
  }

  const positioned: PositionedMarker[] = [];
  for (const marker of markers) {
    const rawOffsetMs = marker.timestamp - startTimestamp;
    if (rawOffsetMs < -toleranceMs || rawOffsetMs > durationMs + toleranceMs) {
      continue;
    }
    positioned.push({ marker, offsetMs: Math.min(Math.max(rawOffsetMs, 0), durationMs) });
  }
  positioned.sort((a, b) => a.offsetMs - b.offsetMs || a.marker.id.localeCompare(b.marker.id));

  const groups: PositionedMarker[][] = [];
  let groupStartPx = Number.NEGATIVE_INFINITY;
  for (const entry of positioned) {
    const positionPx = (entry.offsetMs / durationMs) * widthPx;
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && positionPx - groupStartPx < minSpacingPx) {
      currentGroup.push(entry);
    } else {
      groups.push([entry]);
      groupStartPx = positionPx;
    }
  }

  return groups.map((group) => {
    const groupMarkers = group.map(({ marker }) => marker);
    return {
      id: `bucket-${group[0].marker.id}`,
      offsetMs: group[0].offsetMs,
      positionPx: (group[0].offsetMs / durationMs) * widthPx,
      kind: highestPriorityKind(groupMarkers),
      markers: groupMarkers,
    };
  });
};
