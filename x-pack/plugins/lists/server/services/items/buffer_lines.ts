/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import readLine from 'readline';
import { Readable } from 'stream';

export class BufferLines extends Readable {
  private set = new Set<string>();
  private boundary: string | null = null;
  private readableText: boolean = false;
  private paused: boolean = false;
  private bufferSize: number;
  constructor({ input, bufferSize }: { input: NodeJS.ReadableStream; bufferSize: number }) {
    super({ encoding: 'utf-8' });
    if (bufferSize <= 0) {
      throw new RangeError('bufferSize must be greater than zero');
    }
    this.bufferSize = bufferSize;

    const readline = readLine.createInterface({
      input,
    });

    // We are parsing multipart/form-data involving boundaries as fast as we can to get
    // * The filename if it exists and emit it
    // * The actual content within the multipart/form-data
    readline.on('line', (line) => {
      if (this.boundary == null && line.startsWith('--')) {
        this.boundary = `${line}--`;
      } else if (this.boundary != null && !this.readableText && line.trim() !== '') {
        if (line.startsWith('Content-Disposition')) {
          const fileNameMatch = RegExp('filename="(?<fileName>.+)"');
          const matches = fileNameMatch.exec(line);
          if (matches?.groups?.fileName != null) {
            this.emit('fileName', matches.groups.fileName);
          }
        }
      } else if (this.boundary != null && !this.readableText && line.trim() === '') {
        // we are ready to be readable text now for parsing
        this.readableText = true;
      } else if (this.readableText && line.trim() === '') {
        // skip and do nothing as this is either a empty line or an upcoming end is about to happen
      } else if (this.boundary != null && this.readableText && line === this.boundary) {
        // we are at the end of the stream
        this.boundary = null;
        this.readableText = false;
      } else {
        // we have actual content to push
        this.push(line);
      }
    });

    readline.on('close', () => {
      this.push(null);
    });
  }

  public _read(): void {}

  public pause(): this {
    this.paused = true;
    return this;
  }

  public resume(): this {
    this.paused = false;
    return this;
  }

  private emptyBuffer(): void {
    const arrayFromSet = Array.from(this.set);
    if (arrayFromSet.length === 0) {
      this.emit('lines', []);
    } else {
      while (arrayFromSet.length) {
        const spliced = arrayFromSet.splice(0, this.bufferSize);
        this.emit('lines', spliced);
      }
    }
    this.set.clear();
  }

  public push(line: string | null): boolean {
    if (line != null) {
      this.set.add(line);
      if (this.paused) {
        return false;
      } else {
        if (this.set.size > this.bufferSize) {
          this.emptyBuffer();
        }
        return true;
      }
    } else {
      if (this.paused) {
        // If we paused but have buffered all of the available data
        // we should do wait for 10(ms) and check again if we are paused
        // or not.
        setTimeout(() => {
          this.push(line);
        }, 10);
        return false;
      } else {
        this.emptyBuffer();
        this.emit('close');
        return true;
      }
    }
  }
}
