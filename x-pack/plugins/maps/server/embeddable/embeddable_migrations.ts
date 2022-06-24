/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { moveAttribution } from '../../common/migrations/move_attribution';
import { setEmsTmsDefaultModes } from '../../common/migrations/set_ems_tms_default_modes';
import { renameLayerTypes } from '../../common/migrations/rename_layer_types';
import { extractReferences } from '../../common/migrations/references';

/*
 * Embeddables such as Maps, Lens, and Visualize can be embedded by value or by reference on a dashboard.
 * To ensure that any migrations (>7.12) are run correctly in both cases,
 * the migration function must be registered as both a saved object migration and an embeddable migration
 *
 * This is the embeddable migration registry.
 */
export const embeddableMigrations = {
  '7.14.0': (state: SerializableRecord) => {
    try {
      return {
        ...state,
        attributes: moveAttribution(state as { attributes: MapSavedObjectAttributes }),
      } as SerializableRecord;
    } catch (e) {
      // Do not fail migration
      // Maps application can display error when viewed
      return state;
    }
  },
  '8.0.0': (state: SerializableRecord) => {
    try {
      return {
        ...state,
        attributes: setEmsTmsDefaultModes(state as { attributes: MapSavedObjectAttributes }),
      } as SerializableRecord;
    } catch (e) {
      // Do not fail migration
      // Maps application can display error when viewed
      return state;
    }
  },
  '8.0.1': (state: SerializableRecord) => {
    try {
      const { attributes } = extractReferences(state as { attributes: MapSavedObjectAttributes });
      return {
        ...state,
        attributes,
      } as SerializableRecord;
    } catch (e) {
      // Do not fail migration
      // Maps application can display error when viewed
      return state;
    }
  },
  '8.1.0': (state: SerializableRecord) => {
    try {
      return {
        ...state,
        attributes: renameLayerTypes(state as { attributes: MapSavedObjectAttributes }),
      } as SerializableRecord;
    } catch (e) {
      // Do not fail migration
      // Maps application can display error when viewed
      return state;
    }
  },
};
