/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { extractReferences } from '../../common/migrations/references';
// @ts-expect-error
import { emsRasterTileToEmsVectorTile } from '../../common/migrations/ems_raster_tile_to_ems_vector_tile';
// @ts-expect-error
import { topHitsTimeToSort } from '../../common/migrations/top_hits_time_to_sort';
// @ts-expect-error
import { moveApplyGlobalQueryToSources } from '../../common/migrations/move_apply_global_query';
// @ts-expect-error
import { addFieldMetaOptions } from '../../common/migrations/add_field_meta_options';
// @ts-expect-error
import { migrateSymbolStyleDescriptor } from '../../common/migrations/migrate_symbol_style_descriptor';
import { migrateUseTopHitsToScalingType } from '../../common/migrations/scaling_type';
import { migrateJoinAggKey } from '../../common/migrations/join_agg_key';
import { removeBoundsFromSavedObject } from '../../common/migrations/remove_bounds';
import { setDefaultAutoFitToBounds } from '../../common/migrations/set_default_auto_fit_to_bounds';
import { addTypeToTermJoin } from '../../common/migrations/add_type_to_termjoin';
import { moveAttribution } from '../../common/migrations/move_attribution';
import { setEmsTmsDefaultModes } from '../../common/migrations/set_ems_tms_default_modes';
import { renameLayerTypes } from '../../common/migrations/rename_layer_types';
import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';

function logMigrationWarning(
  context: SavedObjectMigrationContext,
  errorMsg: string,
  doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>
) {
  context.log.warning(
    `map migration failed (${context.migrationVersion}). ${errorMsg}. attributes: ${JSON.stringify(
      doc
    )}`
  );
}

/*
 * Embeddables such as Maps, Lens, and Visualize can be embedded by value or by reference on a dashboard.
 * To ensure that any migrations (>7.12) are run correctly in both cases,
 * the migration function must be registered as both a saved object migration and an embeddable migration
 *
 * This is the saved object migration registry.
 */
export const savedObjectMigrations = {
  '7.2.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const { attributes, references } = extractReferences(doc);

      return {
        ...doc,
        attributes,
        references,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.4.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = emsRasterTileToEmsVectorTile(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.5.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = topHitsTimeToSort(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.6.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributesPhase1 = moveApplyGlobalQueryToSources(doc);
      const attributesPhase2 = addFieldMetaOptions({ attributes: attributesPhase1 });

      return {
        ...doc,
        attributes: attributesPhase2,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.7.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributesPhase1 = migrateSymbolStyleDescriptor(doc);
      const attributesPhase2 = migrateUseTopHitsToScalingType({ attributes: attributesPhase1 });

      return {
        ...doc,
        attributes: attributesPhase2,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.8.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = migrateJoinAggKey(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.9.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = removeBoundsFromSavedObject(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = setDefaultAutoFitToBounds(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.12.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = addTypeToTermJoin(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = moveAttribution(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '8.0.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = setEmsTmsDefaultModes(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
  '8.1.0': (
    doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      const attributes = renameLayerTypes(doc);

      return {
        ...doc,
        attributes,
      };
    } catch (e) {
      logMigrationWarning(context, e.message, doc);
      return doc;
    }
  },
};
