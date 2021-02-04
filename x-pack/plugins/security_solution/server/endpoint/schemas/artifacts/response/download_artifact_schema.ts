/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { buffer, encoding } from '../common';

const headers = t.exact(
  t.type({
    'content-encoding': encoding,
    'content-disposition': t.string,
  })
);

export const downloadArtifactResponseSchema = t.exact(
  t.type({
    body: buffer,
    headers,
  })
);

export type DownloadArtifactResponseSchema = t.TypeOf<typeof downloadArtifactResponseSchema>;
