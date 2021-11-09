/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Writable } from 'stream';

export class MaxSizeStringBuilder {
  private size = 0;
  private pristine = true;

  constructor(private stream: Writable, private maxSizeBytes: number, private bom = '') {}

  tryAppend(chunk: string): boolean {
    const byteLength = Buffer.byteLength(chunk);
    if (this.size + byteLength > this.maxSizeBytes) {
      return false;
    }

    if (this.pristine) {
      this.stream.write(this.bom);
      this.pristine = false;
    }

    this.stream.write(chunk);
    this.size += byteLength;

    return true;
  }

  getSizeInBytes(): number {
    return this.size;
  }
}
