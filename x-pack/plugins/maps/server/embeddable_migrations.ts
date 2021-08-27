/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { moveAttribution } from '../common/migrations/move_attribution';

/*
 * Embeddables such as Maps, Lens, and Visualize can be embedded by value or by reference on a dashboard.
 * To ensure that any migrations (>7.12) are run correctly in both cases,
 * the migration function must be registered as both a saved object migration and an embeddable migration

 * This is the embeddable migration registry.
 */
export const embeddableMigrations = {
  '7.14.0': (state: SerializableRecord) => {
    return {
      ...state,
      attributes: moveAttribution(state as { attributes: MapSavedObjectAttributes }),
    } as SerializableRecord;
  },
};
