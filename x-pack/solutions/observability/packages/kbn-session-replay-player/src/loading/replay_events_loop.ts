/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFullSnapshotEvent, isMetaEvent, parseReplayEvents } from '../model/replay_event_guards';
import { MIN_PLAYABLE_EVENTS, sortByTimestamp } from '../model/playable_events';
import { TimelineIndex } from '../model/timeline_index';
import type { ReplayCursor, ReplayEvent, ReplayEventsLoader } from '../types';

/** Events loaded before the user is asked whether to keep loading, and again after each agreement. */
export const SIZE_THRESHOLD_EVENTS = 50_000;

export interface LoadedBatch {
  /** Events to hand to rrweb: replay events only, in time order, with fetching URLs neutralised. */
  readonly events: readonly ReplayEvent[];
  /** Replay events received so far. */
  readonly playableCount: number;
  /** Whether what has loaded is enough to render a first frame. */
  readonly hasPlayablePrefix: boolean;
  /** The loader delivered its last page. */
  readonly complete: boolean;
  /** Offset of the last loaded event from the first, if any event has loaded. */
  readonly loadedEndMs: number | undefined;
}

export interface ReplayEventsLoopOptions {
  loadEvents: ReplayEventsLoader;
  /** Applied to every event in order; it may keep state between events. */
  neutralize: (event: ReplayEvent) => ReplayEvent;
  onBatch: (batch: LoadedBatch) => void;
  onFailure: (error: Error, hasPlayablePrefix: boolean) => void;
  /** The loader returned a cursor it was already given, so it would never finish. */
  onStuck: () => void;
  /** The size threshold was reached; call `continueLoading` to carry on. */
  onSizeThreshold: () => void;
  sizeThresholdEvents?: number;
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(typeof value === 'string' ? value : 'Loading failed');

/**
 * Pages through a recording one request at a time: the next request uses the cursor of the page
 * before. A failed request leaves the cursor unchanged so a retry never applies a page twice, and
 * aborting stops everything, including a request in flight.
 */
export class ReplayEventsLoop {
  /** Time index of every event that has loaded; duration and idle skipping read from it. */
  public readonly index = new TimelineIndex();

  private readonly controller = new AbortController();
  private cursor: ReplayCursor | undefined;
  private running = false;
  private playableCount = 0;
  private hasMeta = false;
  private hasSnapshot = false;
  private nextThreshold: number;

  constructor(private readonly options: ReplayEventsLoopOptions) {
    this.nextThreshold = options.sizeThresholdEvents ?? SIZE_THRESHOLD_EVENTS;
  }

  public start(): void {
    void this.run();
  }

  /** Re-issues the request that failed, with the cursor it used. */
  public retry(): void {
    void this.run();
  }

  /** Carries on after the size threshold, asking again after another batch of events. */
  public continueLoading(): void {
    this.nextThreshold += this.options.sizeThresholdEvents ?? SIZE_THRESHOLD_EVENTS;
    void this.run();
  }

  public abort(): void {
    this.controller.abort();
  }

  private get hasPlayablePrefix(): boolean {
    return this.playableCount >= MIN_PLAYABLE_EVENTS && this.hasMeta && this.hasSnapshot;
  }

  private get aborted(): boolean {
    return this.controller.signal.aborted;
  }

  private async run(): Promise<void> {
    if (this.running || this.aborted) {
      return;
    }
    this.running = true;
    try {
      while (!this.aborted) {
        if (this.playableCount >= this.nextThreshold) {
          this.options.onSizeThreshold();
          return;
        }
        const requestCursor = this.cursor;
        const page = await this.options.loadEvents({
          cursor: requestCursor,
          signal: this.controller.signal,
        });
        if (this.aborted) {
          return;
        }
        const nextCursor = page.nextCursor;
        const complete = nextCursor === undefined;
        this.applyPage(page.events, complete);
        if (complete) {
          return;
        }
        if (nextCursor === requestCursor) {
          this.options.onStuck();
          return;
        }
        this.cursor = nextCursor;
      }
    } catch (error) {
      if (!this.aborted) {
        this.options.onFailure(toError(error), this.hasPlayablePrefix);
      }
    } finally {
      this.running = false;
    }
  }

  private applyPage(rawEvents: readonly ReplayEvent[], complete: boolean): void {
    const events = sortByTimestamp(parseReplayEvents(rawEvents)).map(this.options.neutralize);
    this.playableCount += events.length;
    this.hasMeta = this.hasMeta || events.some(isMetaEvent);
    this.hasSnapshot = this.hasSnapshot || events.some(isFullSnapshotEvent);
    this.index.add(events.map(({ timestamp }) => timestamp));

    const start = this.index.startTimestamp;
    const end = this.index.endTimestamp;
    this.options.onBatch({
      events,
      playableCount: this.playableCount,
      hasPlayablePrefix: this.hasPlayablePrefix,
      complete,
      loadedEndMs: start === undefined || end === undefined ? undefined : end - start,
    });
  }
}
