/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deflate } from 'zlib';
import { BinaryLike, createHash } from 'crypto';
import { promisify } from 'util';
import { SourceMap } from './route';

const deflateAsync = promisify(deflate);

function asSha256Encoded(content: BinaryLike): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function getEncodedContent(sourceMapContent: SourceMap) {
  const contentBuffer = Buffer.from(JSON.stringify(sourceMapContent));
  const contentZipped = await deflateAsync(contentBuffer);
  const contentEncoded = contentZipped.toString('base64');
  const contentHash = asSha256Encoded(contentZipped);
  return { contentEncoded, contentHash };
}

export function getSourceMapId({
  serviceName,
  serviceVersion,
  bundleFilepath,
}: {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
}) {
  return [serviceName, serviceVersion, bundleFilepath].join('-');
}
