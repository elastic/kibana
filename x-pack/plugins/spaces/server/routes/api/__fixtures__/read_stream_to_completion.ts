/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { createPromiseFromStreams, createConcatStream } from 'src/legacy/utils';

export async function readStreamToCompletion(stream: Readable) {
  return (await (createPromiseFromStreams([stream, createConcatStream([])]) as unknown)) as any[];
}
