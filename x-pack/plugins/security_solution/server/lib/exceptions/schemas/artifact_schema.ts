/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { artifactName, body, created, encoding, schemaVersion, sha256, size } from './common';

export const artifactSoSchema = t.exact(
  t.type({
    artifactName,
    schemaVersion,
    sha256,
    encoding,
    created,
    body,
    size,
  })
);

export type ArtifactSoSchema = t.TypeOf<typeof artifactSoSchema>;
