/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common';
import type { ManifestManager } from '../services';

export const migrateUserArtifactManifest = async (
  experimentalFeatures: ExperimentalFeatures,
  manifestManager: ManifestManager | undefined,
  logger: Logger
): Promise<void> => {
  if (experimentalFeatures.unifiedManifestEnabled) {
    logger.info(
      'Unified manifest feature is enabled. Checking legacy user artifact manifest for compliance'
    );
    await manifestManager?.migrateLegacyManifestToUnifiedManifest();
  } else {
    logger.info('Unified manifest feature is disabled. Checking unified manifest for compliance');
    await manifestManager?.migrateUnifiedManifestsToLegacyManifests();
  }
};
