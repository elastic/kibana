/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type ArtifactName = 'global-whitelist';
type ArtifactVersion = '1.0.0';
type ArtifactEncoding = 'xz';

// TODO: define runtime types
export interface ExceptionsArtifactSavedObject {
  name: ArtifactName;
  schemaVersion: ArtifactVersion;
  sha256: string;
  encoding: ArtifactEncoding;
  created: number;
  body: string;
}
