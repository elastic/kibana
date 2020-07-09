/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DEFAULT_MAX_SIZE = 10;

/**
 * FIFO cache implementation for artifact downloads.
 */
export class ExceptionsCache {
  private cache: Map<string, Buffer>;
  private queue: string[];
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.queue = [];
    this.maxSize = maxSize || DEFAULT_MAX_SIZE;
  }

  set(id: string, body: Buffer) {
    if (this.queue.length + 1 > this.maxSize) {
      const entry = this.queue.shift();
      if (entry !== undefined) {
        this.cache.delete(entry);
      }
    }
    this.queue.push(id);
    this.cache.set(id, body);
  }

  get(id: string): Buffer | undefined {
    return this.cache.get(id);
  }
}
