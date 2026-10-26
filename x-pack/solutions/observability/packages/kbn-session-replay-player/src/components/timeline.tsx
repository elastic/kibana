/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { layoutMarkers } from '../model/marker_layout';
import type { MarkerBucket } from '../model/marker_layout';
import { formatClock } from '../model/time_format';
import {
  TIMELINE_LABEL,
  TIMELINE_MARKERS_LABEL,
  formatMarkerAriaLabel,
  formatPositionText,
} from '../translations';
import type { ReplayMarker, ReplayMarkerKind } from '../types';
import { offsetForKey } from './timeline_keyboard';
import { useElementSize } from './use_element_size';

export interface TimelineProps {
  offsetMs: number;
  durationMs: number;
  /** Offset up to which events have loaded; the rest of the track is shown as not loaded yet. */
  loadedEndMs?: number;
  /** Epoch milliseconds of the first event; markers are placed relative to it. */
  startTimestamp?: number;
  markers?: readonly ReplayMarker[];
  onSeek: (offsetMs: number) => void;
}

const markerColor = (kind: ReplayMarkerKind, { colors }: EuiThemeComputed): string => {
  switch (kind) {
    case 'error':
      return colors.danger;
    case 'navigation':
      return colors.primary;
    case 'click':
      return colors.textSubdued;
  }
};

const markerLabel = (bucket: MarkerBucket): string => {
  const lead = bucket.markers.find(({ kind }) => kind === bucket.kind) ?? bucket.markers[0];
  return formatMarkerAriaLabel({
    kind: bucket.kind,
    label: lead.label,
    clock: formatClock(bucket.offsetMs),
    count: bucket.markers.length,
  });
};

/**
 * A seek bar that doubles as the timeline: a slider for the position, with markers above it that
 * jump to an event. Markers close together are merged into one so they stay readable, and the
 * merged marker takes the colour of the most important kind it contains.
 */
export const Timeline = ({
  offsetMs,
  durationMs,
  loadedEndMs,
  startTimestamp,
  markers = [],
  onSeek,
}: TimelineProps) => {
  const { euiTheme } = useEuiTheme();
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const { width: trackWidth } = useElementSize(track);
  const [dragging, setDragging] = useState(false);

  const safeDuration = Math.max(durationMs, 0);
  const progress = safeDuration > 0 ? Math.min(offsetMs / safeDuration, 1) : 0;
  const loaded =
    loadedEndMs === undefined || safeDuration === 0 ? 1 : Math.min(loadedEndMs / safeDuration, 1);

  const buckets =
    startTimestamp === undefined
      ? []
      : layoutMarkers(markers, {
          startTimestamp,
          endTimestamp: startTimestamp + safeDuration,
          widthPx: trackWidth,
        });

  const seekFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!track || safeDuration === 0) {
        return;
      }
      const { left, width } = track.getBoundingClientRect();
      if (width === 0) {
        return;
      }
      const ratio = Math.min(Math.max((event.clientX - left) / width, 0), 1);
      onSeek(Math.round(ratio * safeDuration));
    },
    [track, safeDuration, onSeek]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = offsetForKey({ key: event.key, offsetMs, durationMs: safeDuration });
    if (target !== undefined) {
      event.preventDefault();
      onSeek(target);
    }
  };

  const wrapperStyles = css`
    position: relative;
    padding-top: ${euiTheme.size.base};
  `;
  const trackStyles = css`
    position: relative;
    height: ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    background: ${euiTheme.colors.lightShade};
    cursor: pointer;
    touch-action: none;
    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: 2px;
    }
  `;
  const loadedStyles = css`
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: ${euiTheme.colors.mediumShade};
  `;
  const progressStyles = css`
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: ${euiTheme.colors.primary};
  `;
  const markerStyles = css`
    position: absolute;
    top: 0;
    width: ${euiTheme.size.xs};
    height: ${euiTheme.size.base};
    padding: 0;
    border: 0;
    border-radius: ${euiTheme.border.radius.small};
    transform: translateX(-50%);
    cursor: pointer;
    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
    }
    /* The kind shows in the shape as well as the colour. */
    &[data-marker-kind='error'] {
      width: ${euiTheme.size.m};
      border-radius: 0;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    }
    &[data-marker-kind='click'] {
      height: ${euiTheme.size.s};
      top: ${euiTheme.size.xs};
      border-radius: 50%;
    }
  `;

  return (
    <div css={wrapperStyles} data-test-subj="sessionReplayTimeline">
      <div role="group" aria-label={TIMELINE_MARKERS_LABEL}>
        {startTimestamp !== undefined &&
          buckets.map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              css={markerStyles}
              style={{
                left: bucket.positionPx,
                backgroundColor: markerColor(bucket.kind, euiTheme),
              }}
              aria-label={markerLabel(bucket)}
              title={markerLabel(bucket)}
              onClick={() => onSeek(bucket.offsetMs)}
              data-test-subj="sessionReplayMarker"
              data-marker-kind={bucket.kind}
            />
          ))}
      </div>
      <div
        ref={setTrack}
        css={trackStyles}
        role="slider"
        tabIndex={0}
        aria-label={TIMELINE_LABEL}
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={Math.min(Math.max(offsetMs, 0), safeDuration)}
        aria-valuetext={formatPositionText(formatClock(offsetMs), formatClock(safeDuration))}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
          seekFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging) {
            seekFromPointer(event);
          }
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        data-test-subj="sessionReplayTimelineSlider"
      >
        <div css={loadedStyles} style={{ width: `${loaded * 100}%` }} />
        <div css={progressStyles} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
};
