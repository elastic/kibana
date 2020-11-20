/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from '../plugin';

const CLOSE_TO_FULL_PERCENT = 0.9;

type SystemLogger = Plugin['systemLogger'];

export interface IBoundedQueue<T> {
  maxLength: number;
  length: number;
  push(object: T): void;
  pull(count: number): T[];
  isEmpty(): boolean;
  isFull(): boolean;
  isCloseToFull(): boolean;
}

export interface CreateBoundedQueueParams<T> {
  maxLength: number;
  onDiscarded(object: T): void;
  logger: SystemLogger;
}

export function createBoundedQueue<T>(params: CreateBoundedQueueParams<T>): IBoundedQueue<T> {
  if (params.maxLength <= 0) throw new Error(`invalid bounded queue maxLength ${params.maxLength}`);

  return new BoundedQueue<T>(params);
}

class BoundedQueue<T> implements IBoundedQueue<T> {
  private _maxLength: number;
  private _buffer: T[];
  private _onDiscarded: (object: T) => void;
  private _logger: SystemLogger;

  constructor(params: CreateBoundedQueueParams<T>) {
    this._maxLength = params.maxLength;
    this._buffer = [];
    this._onDiscarded = params.onDiscarded;
    this._logger = params.logger;
  }

  public get maxLength(): number {
    return this._maxLength;
  }

  public get length(): number {
    return this._buffer.length;
  }

  isEmpty() {
    return this._buffer.length === 0;
  }

  isFull() {
    return this._buffer.length >= this._maxLength;
  }

  isCloseToFull() {
    return this._buffer.length / this._maxLength >= CLOSE_TO_FULL_PERCENT;
  }

  push(object: T) {
    this.ensureRoom();
    this._buffer.push(object);
  }

  pull(count: number) {
    if (count <= 0) throw new Error(`invalid pull count ${count}`);

    return this._buffer.splice(0, count);
  }

  private ensureRoom() {
    if (this.length < this._maxLength) return;

    const discarded = this.pull(this.length - this._maxLength + 1);
    for (const object of discarded) {
      try {
        this._onDiscarded(object!);
      } catch (err) {
        this._logger.warn(`error discarding circular buffer entry: ${err.message}`);
      }
    }
  }
}
