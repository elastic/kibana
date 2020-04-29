/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import readLine from 'readline';
import { Readable } from 'stream';

const BUFFER_SIZE = 100;

export class BufferLines extends Readable {
  private set = new Set<string>();
  constructor({ input }: { input: NodeJS.ReadableStream }) {
    super({ encoding: 'utf-8' });
    const readline = readLine.createInterface({
      input,
    });

    readline.on('line', line => {
      this.push(line);
    });

    readline.on('close', () => {
      this.push(null);
    });
  }

  public _read(): void {
    // No operation but this is required to be implemented
  }

  public push(line: string | null): boolean {
    if (line == null) {
      this.emit('lines', Array.from(this.set));
      this.set.clear();
      this.emit('close');
      return true;
    } else {
      this.set.add(line);
      if (this.set.size > BUFFER_SIZE) {
        this.emit('lines', Array.from(this.set));
        this.set.clear();
        return true;
      } else {
        return true;
      }
    }
  }
}
