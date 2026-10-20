/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sorted timestamps of the events handed to the player. Duration, idle skipping and marker
 * placement read from this index so they stay correct while pages are still being appended.
 */
export class TimelineIndex {
  private timestamps: number[] = [];

  public get size(): number {
    return this.timestamps.length;
  }

  public get startTimestamp(): number | undefined {
    return this.timestamps[0];
  }

  public get endTimestamp(): number | undefined {
    return this.timestamps[this.timestamps.length - 1];
  }

  /** Milliseconds between the first and the last known event. */
  public get durationMs(): number {
    const start = this.startTimestamp;
    const end = this.endTimestamp;
    return start === undefined || end === undefined ? 0 : end - start;
  }

  public add(timestamps: readonly number[]): void {
    if (timestamps.length === 0) {
      return;
    }
    const previousEnd = this.endTimestamp;
    this.timestamps.push(...timestamps);
    const appendedInOrder =
      (previousEnd === undefined || timestamps[0] >= previousEnd) &&
      timestamps.every(
        (timestamp, position) => position === 0 || timestamp >= timestamps[position - 1]
      );
    if (!appendedInOrder) {
      this.timestamps.sort((a, b) => a - b);
    }
  }

  /** The earliest known timestamp strictly after `timestamp`, if any. */
  public firstTimestampAfter(timestamp: number): number | undefined {
    let low = 0;
    let high = this.timestamps.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.timestamps[middle] <= timestamp) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return this.timestamps[low];
  }
}
