/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';

export function bufferToStream(buffer: Buffer): PassThrough {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
}

export function streamToString(stream: NodeJS.ReadableStream | Buffer | null): Promise<string> {
  // handle isAirGapped case, which returns an empty string
  if (!stream) return Promise.resolve('');

  if (stream instanceof Buffer) return Promise.resolve(stream.toString());
  return new Promise((resolve, reject) => {
    const body: string[] = [];
    stream.on('data', (chunk: string) => body.push(chunk));
    stream.on('end', () => resolve(body.join('')));
    stream.on('error', reject);
  });
}

export function streamToBuffer(stream: NodeJS.ReadableStream | null): Promise<Buffer> {
  // handle isAirGapped case, which returns an empty string
  if (!stream) throw new Error('No stream found');

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
