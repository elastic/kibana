/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const artifactName = t.string;
export const sha256 = t.string;

export const downloadArtifactReqParamsSchema = t.exact(
  t.type({
    artifactName,
    sha256,
  })
);

export type DownloadArtifactReqParamsSchema = t.TypeOf<typeof downloadArtifactReqParamsSchema>;
