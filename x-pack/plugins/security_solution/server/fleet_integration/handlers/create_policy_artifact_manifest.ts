/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ManifestManager } from '../../endpoint/services';
import { Manifest, reportErrors } from '../../endpoint/lib/artifacts';
import { InternalArtifactCompleteSchema } from '../../endpoint/schemas';
import { manifestDispatchSchema, ManifestSchema } from '../../../common/endpoint/schema/manifest';

const getManifest = async (logger: Logger, manifestManager: ManifestManager): Promise<Manifest> => {
  let manifest: Manifest | null = null;

  try {
    manifest = await manifestManager.getLastComputedManifest();

    // If we have not yet computed a manifest, then we have to do so now. This should only happen
    // once.
    if (manifest == null) {
      // New computed manifest based on current state of exception list
      const newManifest = await manifestManager.buildNewManifest();

      // Persist new artifacts
      const persistErrors = await manifestManager.pushArtifacts(
        newManifest.getAllArtifacts() as InternalArtifactCompleteSchema[],
        newManifest
      );
      if (persistErrors.length) {
        reportErrors(logger, persistErrors);
        throw new Error('Unable to persist new artifacts.');
      }

      // Commit the manifest state
      await manifestManager.commit(newManifest);

      manifest = newManifest;
    }
  } catch (err) {
    logger.error(err);
  }

  return manifest ?? ManifestManager.createDefaultManifest();
};

/**
 * Creates the initial manifest to be included in a policy when it is first created in fleet
 */
export const createPolicyArtifactManifest = async (
  logger: Logger,
  manifestManager: ManifestManager
): Promise<ManifestSchema> => {
  // Get most recent manifest
  const manifest = await getManifest(logger, manifestManager);
  const serializedManifest = manifest.toPackagePolicyManifest();

  if (!manifestDispatchSchema.is(serializedManifest)) {
    // This should not happen.
    // But if it does, we log it and return it anyway.
    logger.error('Invalid manifest');
  }

  return serializedManifest;
};
