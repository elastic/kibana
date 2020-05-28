/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
import { ExceptionsArtifactSavedObject } from '.types';

export interface ExceptionsArtifact {
  getArtifact: (
    request: FrameworkRequest,
    sha256: string
  ) => Promise<ExceptionsArtifactSavedObject>;
}
