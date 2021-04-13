/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, Logger } from 'kibana/server';
import { EndpointArtifactClientInterface } from '../../services';
import { InternalArtifactCompleteSchema } from '../../schemas';
import { ArtifactConstants } from './common';

class ArtifactMigrationError extends Error {
  constructor(message: string, public readonly meta?: unknown) {
    super(message);
  }
}

/**
 * With v7.13, artifact storage was moved from a security_solution saved object to a fleet index
 * in order to support Fleet Server.
 */
export const migrateArtifactsToFleet = async (
  soClient: SavedObjectsClient,
  endpointArtifactClient: EndpointArtifactClientInterface,
  logger: Logger,
  isFleetServerEnabled: boolean
): Promise<void> => {
  if (!isFleetServerEnabled) {
    logger.debug('Skipping Artifacts migration. [fleetServerEnabled] flag is off');
    return;
  }

  let totalArtifactsMigrated = -1;
  let hasMore = true;

  try {
    while (hasMore) {
      // Retrieve list of artifact records
      const {
        saved_objects: artifactList,
        total,
      } = await soClient.find<InternalArtifactCompleteSchema>({
        type: ArtifactConstants.SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 10,
      });

      if (totalArtifactsMigrated === -1) {
        totalArtifactsMigrated = total;
        if (total > 0) {
          logger.info(`Migrating artifacts from SavedObject`);
        }
      }

      // If nothing else to process, then exit out
      if (total === 0) {
        hasMore = false;
        if (totalArtifactsMigrated > 0) {
          logger.info(`Total Artifacts migrated: ${totalArtifactsMigrated}`);
        }
        return;
      }

      for (const artifact of artifactList) {
        // Create new artifact in fleet index
        await endpointArtifactClient.createArtifact(artifact.attributes);
        // Delete old artifact from SO and if there are errors here, then ignore 404's
        // since multiple kibana instances could be going at this
        try {
          await soClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, artifact.id);
        } catch (e) {
          if (e?.output?.statusCode !== 404) {
            throw e;
          }
          logger.debug(
            `Artifact Migration: Attempt to delete Artifact SO [${artifact.id}] returned 404`
          );
        }
      }
    }
  } catch (e) {
    const error = new ArtifactMigrationError('Artifact SO migration failed', e);
    logger.error(error);
    throw error;
  }
};
