/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUtf8 } from '@smithy/util-utf8';
import { BedrockChunkMember } from '../../../util/eventstream_serde_into_observable';

export function parseSerdeChunkBody(chunk: BedrockChunkMember['chunk']) {
  return JSON.parse(Buffer.from(JSON.parse(toUtf8(chunk.body)).bytes, 'base64').toString('utf-8'));
}
