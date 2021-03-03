/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetArtifactsClient } from './client';

describe('When using the Fleet Artifacts Client', () => {
  let artifactClient: FleetArtifactsClient;

  beforeEach(() => {
    artifactClient = new FleetArtifactsClient('', 'test-package-name');
  });

  describe('and calling the `createArtifact()` method', () => {});
});
