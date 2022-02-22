/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from 'src/core/server';
import {
  APM_INDICES_SAVED_OBJECT_ID,
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SPACE_SAVED_OBJECT_ID,
  APM_INDICES_SPACE_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { ApmIndicesConfig } from '../../routes/settings/apm_indices/get_apm_indices';

export async function migrateLegacyAPMIndicesToSpaceAware({
  coreStart,
}: {
  coreStart: CoreStart;
}) {
  const repository = coreStart.savedObjects.createInternalRepository(['space']);
  try {
    // Fetch legacy APM indices
    const legacyAPMIndices = await repository.get<Partial<ApmIndicesConfig>>(
      APM_INDICES_SAVED_OBJECT_TYPE,
      APM_INDICES_SAVED_OBJECT_ID
    );

    // Fetch spaces available
    const spaces = await repository.find({
      type: 'space',
      page: 1,
      perPage: 10_000, // max number of spaces as of 8.1
      fields: ['name'], // to avoid fetching *all* fields
    });

    // Create new APM indices space aware for all spaces available
    await repository.bulkCreate(
      spaces.saved_objects.map(({ id: spaceId }) => ({
        id: APM_INDICES_SPACE_SAVED_OBJECT_ID,
        type: APM_INDICES_SPACE_SAVED_OBJECT_TYPE,
        initialNamespaces: [spaceId],
        attributes: legacyAPMIndices.attributes,
      }))
    );

    // Delete legacy APM indices
    await repository.delete(
      APM_INDICES_SAVED_OBJECT_TYPE,
      APM_INDICES_SAVED_OBJECT_ID
    );
  } catch (e) {
    // Does nothing when an exception happens (repository.get throws an exception when a saved object is not found)
  }
}
