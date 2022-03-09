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
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import {
  APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
  APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { ApmIndicesConfig } from '../../routes/settings/apm_indices/get_apm_indices';
import { APMIndices } from '../apm_indices';

async function fetchLegacyAPMIndices(repository: ISavedObjectsRepository) {
  try {
    const apmIndices = await repository.get<Partial<APMIndices>>(
      APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
      APM_INDEX_SETTINGS_SAVED_OBJECT_ID
    );
    if (apmIndices.attributes.isSpaceAware) {
      // This has already been migrated to become space-aware
      return null;
    }
    return apmIndices;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      // This can happen if APM is not being used
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

    const savedObjectAttributes = {
      ...legacyAPMIndices.attributes,
      isSpaceAware: true,
    };

    // Calls create first to update the default space setting isSpaceAware to true
    await repository.create<
      Partial<ApmIndicesConfig & { isSpaceAware: boolean }>
    >(APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE, savedObjectAttributes, {
      id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
      overwrite: true,
    });

    // Create new APM indices space aware for all spaces available
    await repository.bulkCreate<Partial<APMIndices>>(
      spaces.saved_objects
        // Skip default space since it was already updated
        .filter(({ id: spaceId }) => spaceId !== 'default')
        .map(({ id: spaceId }) => ({
          id: APM_INDEX_SETTINGS_SAVED_OBJECT_ID,
          type: APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE,
          initialNamespaces: [spaceId],
          attributes: savedObjectAttributes,
        }))
    );
  } catch (e) {
    logger.error('Failed to migrate legacy APM indices object: ' + e.message);
  }
}
