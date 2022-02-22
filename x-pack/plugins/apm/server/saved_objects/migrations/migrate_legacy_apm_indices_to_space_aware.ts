/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CoreStart,
  Logger,
  ISavedObjectsRepository,
} from 'src/core/server';
import { SavedObjectsErrorHelpers } from 'src/core/server';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { ApmIndicesConfig } from '../../routes/settings/apm_indices/get_apm_indices';

// Legacy APM indices saved objects
const APM_INDICES_LEGACY_SAVED_OBJECT_TYPE = 'apm-indices';
const APM_INDICES_LEGACY_SAVED_OBJECT_ID = 'apm-indices';

/**
 * Legacy APM indices config object attributes (pre-8.2).
 * We need to keep a snapshot of this interface to guard against any incompatible ApmIndicesConfig interface changes in the future.
 */
interface LegacyApmIndicesConfig {
  sourcemap: string;
  error: string;
  onboarding: string;
  span: string;
  transaction: string;
  metric: string;
  apmAgentConfigurationIndex: string;
  apmCustomLinkIndex: string;
}

async function fetchLegacyAPMIndices(repository: ISavedObjectsRepository) {
  try {
    const legacyAPMIndices = await repository.get<
      Partial<LegacyApmIndicesConfig>
    >(APM_INDICES_LEGACY_SAVED_OBJECT_TYPE, APM_INDICES_LEGACY_SAVED_OBJECT_ID);
    return legacyAPMIndices;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      // This is expected after the legacy APM indices object has been migrated for the first time.
      return null;
    }
    throw err;
  }
}

export async function migrateLegacyAPMIndicesToSpaceAware({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}) {
  const repository = coreStart.savedObjects.createInternalRepository(['space']);
  try {
    // Fetch legacy APM indices
    const legacyAPMIndices = await fetchLegacyAPMIndices(repository);
    if (legacyAPMIndices === null) {
      return;
    }

    // Fetch spaces available
    const spaces = await repository.find({
      type: 'space',
      page: 1,
      perPage: 10_000, // max number of spaces as of 8.2
      fields: ['name'], // to avoid fetching *all* fields
    });

    // Create new APM indices space aware for all spaces available
    await repository.bulkCreate<Partial<ApmIndicesConfig>>(
      spaces.saved_objects.map(({ id: spaceId }) => ({
        id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
        type: APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
        initialNamespaces: [spaceId],
        attributes: legacyAPMIndices.attributes,
      }))
    );

    // Delete legacy APM indices
    await repository.delete(
      APM_INDICES_LEGACY_SAVED_OBJECT_TYPE,
      APM_INDICES_LEGACY_SAVED_OBJECT_ID
    );
  } catch (e) {
    logger.error('Failed to migrate legacy APM indices object: ' + e.message);
  }
}
