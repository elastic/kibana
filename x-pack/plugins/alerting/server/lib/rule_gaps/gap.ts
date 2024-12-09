/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GapStatus, gapStatus } from '../../../common/constants';

import { Gap as GapType, Interval, StringInterval } from './types';

import {
  mergeIntervals,
  subtractAllIntervals,
  sumIntervalsDuration,
  intervalDuration,
  subtractIntervals,
  normalizeInterval,
  denormalizeInterval,
} from './utils/intervals';

interface GapConstructorParams {
  range: StringInterval;
  filledIntervals?: StringInterval[];
  inProgressIntervals?: StringInterval[];
  meta?: {
    _id: string;
    _index: string;
    _seq_no: string;
    _primary_term: string;
  };
}

export class Gap {
  private _range: Interval;
  private _filledIntervals: Interval[];
  private _inProgressIntervals: Interval[];
  private _meta?: {
    _id: string;
    _index: string;
    _seq_no: string;
    _primary_term: string;
  };

  constructor({
    range,
    filledIntervals = [],
    inProgressIntervals = [],
    meta,
  }: GapConstructorParams) {
    this._range = normalizeInterval(range);
    this._filledIntervals = mergeIntervals(filledIntervals.map(normalizeInterval));
    this._inProgressIntervals = mergeIntervals(inProgressIntervals.map(normalizeInterval));
    if (meta) {
      this._meta = meta;
    }
  }

  public fillGap(interval: Interval): void {
    this._filledIntervals = mergeIntervals([...this.filledIntervals, interval]);
  }

  public addInProgress(interval: StringInterval): void {
    const normalized = normalizeInterval(interval);
    const sanitized = subtractAllIntervals([normalized], this.filledIntervals);
    this._inProgressIntervals = mergeIntervals([...this.inProgressIntervals, ...sanitized]);
  }

  public get range() {
    return this._range;
  }

  public get filledIntervals() {
    return this._filledIntervals;
  }

  public get inProgressIntervals() {
    return this._inProgressIntervals;
  }

  /**
   * unfilled = range - (filled + inProgress)
   */
  public get unfilledIntervals(): Interval[] {
    const combined = mergeIntervals([...this.filledIntervals, ...this.inProgressIntervals]);
    return subtractIntervals(this.range, combined);
  }

  public get totalGapDurationMs(): number {
    return intervalDuration(this.range);
  }

  public get filledGapDurationMs(): number {
    return sumIntervalsDuration(this.filledIntervals);
  }

  public get unfilledGapDurationMs(): number {
    return sumIntervalsDuration(this.unfilledIntervals);
  }

  public get inProgressGapDurationMs(): number {
    return sumIntervalsDuration(this.inProgressIntervals);
  }

  public get status(): GapStatus {
    if (this.unfilledGapDurationMs === this.totalGapDurationMs) {
      return gapStatus.UNFILLED;
    } else if (this.unfilledGapDurationMs === 0 && this.inProgressGapDurationMs === 0) {
      return gapStatus.FILLED;
    } else {
      return gapStatus.PARTIALLY_FILLED;
    }
  }

  public get meta() {
    return this._meta;
  }

  public getState(): GapType {
    return {
      range: denormalizeInterval(this.range),
      filledIntervals: this.filledIntervals.map(denormalizeInterval),
      inProgressIntervals: this.inProgressIntervals.map(denormalizeInterval),
      unfilledIntervals: this.unfilledIntervals.map(denormalizeInterval),
      status: this.status,
      totalGapDurationMs: this.totalGapDurationMs,
      filledDurationMs: this.filledGapDurationMs,
      unfilledDurationMs: this.unfilledGapDurationMs,
      inProgressDurationMs: this.inProgressGapDurationMs,
    };
  }

  /**
   * Returns the gap object for es
   */
  public getEsObject() {
    return {
      range: denormalizeInterval(this.range),
      filled_intervals: this.filledIntervals.map(denormalizeInterval),
      in_progress_intervals: this.inProgressIntervals.map(denormalizeInterval),
      unfilled_intervals: this.unfilledIntervals.map(denormalizeInterval),
      status: this.status,
      total_gap_duration_ms: this.totalGapDurationMs,
      filled_duration_ms: this.filledGapDurationMs,
      unfilled_duration_ms: this.unfilledGapDurationMs,
      in_progress_duration_ms: this.inProgressGapDurationMs,
    };
  }
}
