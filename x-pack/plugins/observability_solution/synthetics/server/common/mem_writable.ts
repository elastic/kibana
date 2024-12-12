/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable, WritableOptions } from 'node:stream';

export class MemWritable extends Writable {
  private _queue: Buffer[];
  constructor(opts?: WritableOptions) {
    super(opts);
    this._queue = [];
  }

  public get buffer(): Buffer {
    return Buffer.concat(this._queue);
  }

  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null | undefined) => void
  ): void {
    this._queue.push(chunk);
    callback();
  }
}
