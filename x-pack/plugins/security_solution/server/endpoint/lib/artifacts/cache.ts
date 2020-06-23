/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const DEFAULT_TTL = 1000;

export class ExceptionsCache {
  private cache: Map<string, string>;
  private requested: string[];
  private ttl: number;

  constructor(ttl: number) {
    this.cache = new Map();
    this.requested = [];
    this.ttl = ttl ? ttl : DEFAULT_TTL;
    this.startClean();
  }

  private startClean() {
    setInterval(() => this.clean, this.ttl);
  }

  clean() {
    for (const v of this.cache.keys()) {
      if (!this.requested.includes(v)) {
        this.cache.delete(v);
      }
    }
    this.requested = [];
  }

  set(id: string, body: string) {
    this.cache.set(id, body);
  }

  get(id: string): string | undefined {
    this.requested.push(id);
    return this.cache.get(id);
  }
}
