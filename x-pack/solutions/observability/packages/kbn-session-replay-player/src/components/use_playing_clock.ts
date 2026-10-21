/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

export const STATE_UPDATE_INTERVAL_MS = 100;
export const REPORT_INTERVAL_MS = 250;

export interface PlayingClockCallbacks {
  /** Called on every animation frame while active. */
  onFrame: () => void;
  /** Called at most every `STATE_UPDATE_INTERVAL_MS`. */
  onStateTick: () => void;
  /** Called at most every `REPORT_INTERVAL_MS`. */
  onReportTick: () => void;
}

/**
 * Drives per-frame work while `active`, and the two slower cadences that follow it: one for
 * what the screen shows, one for what the host is told. Nothing runs when inactive.
 */
export const usePlayingClock = (active: boolean, callbacks: PlayingClockCallbacks): void => {
  const latest = useRef(callbacks);
  latest.current = callbacks;

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let frame = 0;
    let lastStateTick = Number.NEGATIVE_INFINITY;
    let lastReportTick = Number.NEGATIVE_INFINITY;

    const tick = (now: number) => {
      latest.current.onFrame();
      if (now - lastStateTick >= STATE_UPDATE_INTERVAL_MS) {
        lastStateTick = now;
        latest.current.onStateTick();
      }
      if (now - lastReportTick >= REPORT_INTERVAL_MS) {
        lastReportTick = now;
        latest.current.onReportTick();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
};
