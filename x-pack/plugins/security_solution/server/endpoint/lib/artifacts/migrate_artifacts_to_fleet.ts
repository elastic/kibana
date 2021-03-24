/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, Logger } from 'kibana/server';
import { EndpointArtifactClientInterface } from '../../services';

/**
 * With v7.13, artifact storage was moved from a security_solution saved object to a fleet index
 * in order to support Fleet Server.
 */
export const migrateArtifactsToFleet = async (
  soClient: SavedObjectsClient,
  endpointArtifactClient: EndpointArtifactClientInterface,
  logger: Logger
): Promise<void> => {
  const hasMore = true;
  const failures: number = 0;

  while (hasMore) {
    // 1. Make the call to SO's looking for artifats
    // 2. If there are none, then set `hasMore` to false (breaks loop
    // 3. Create new artifact in fleet index
    //    use `continue` if it fails
    // 4. Delete artifact from SO
    //    use `continue` if it fails
  }
};
