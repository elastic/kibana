/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class MaxSizeStringBuilder {
  private _buffer: Buffer;
  private _size: number;
  private _maxSize: number;
  private _bom: string;

  constructor(maxSizeBytes: number, bom = '') {
    this._buffer = Buffer.alloc(maxSizeBytes);
    this._size = 0;
    this._maxSize = maxSizeBytes;
    this._bom = bom;
  }

  tryAppend(str: string) {
    const byteLength = Buffer.byteLength(str);
    if (this._size + byteLength <= this._maxSize) {
      this._buffer.write(str, this._size);
      this._size += byteLength;
      return true;
    }

    return false;
  }

  getSizeInBytes() {
    return this._size;
  }

  getString() {
    return this._bom + this._buffer.slice(0, this._size).toString();
  }
}
