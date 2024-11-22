/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
} from '@kbn/kibana-utils-plugin/common';
import { DOC_TYPE } from '../../common/constants';
import {
  commonEnhanceTableRowHeight,
  commonPreserveOldLegendSizeDefault,
  commonFixValueLabelsInXY,
  commonLockOldMetricVisSettings,
  commonMakeReversePaletteAsCustom,
  commonRemoveTimezoneDateHistogramParam,
  commonRenameFilterReferences,
  commonRenameOperationsForFormula,
  commonRenameRecordsField,
  commonSetIncludeEmptyRowsDateHistogram,
  commonSetLastValueShowArrayValues,
  commonUpdateVisLayerType,
  getLensCustomVisualizationMigrations,
  getLensFilterMigrations,
  commonEnrichAnnotationLayer,
  getLensDataViewMigrations,
  commonMigrateMetricIds,
  commonMigratePartitionChartGroups,
  commonMigratePartitionMetrics,
  commonMigrateIndexPatternDatasource,
  commonMigrateMetricFormatter,
} from '../migrations/common_migrations';
import {
  CustomVisualizationMigrations,
  LensDocShape713,
  LensDocShape715,
  LensDocShape810,
  LensDocShape850,
  LensDocShapePre712,
  LensDocShape860,
  VisState716,
  VisState810,
  VisState850,
  VisStatePre715,
  VisStatePre830,
  XYVisState850,
} from '../migrations/types';
import { extract, inject } from '../../common/embeddable_factory';
import { getSchema } from './schema';

export const makeLensEmbeddableFactory =
  (
    getFilterMigrations: () => MigrateFunctionsObject,
    getDataViewMigrations: () => MigrateFunctionsObject,
    customVisualizationMigrations: CustomVisualizationMigrations
  ) =>
  (): EmbeddableRegistryDefinition => {
    return {
      id: DOC_TYPE,
      migrations: () =>
        mergeMigrationFunctionMaps(
          mergeMigrationFunctionMaps(
            mergeMigrationFunctionMaps(getLensFilterMigrations(getFilterMigrations()), {
              // This migration is run in 7.13.1 for `by value` panels because the 7.13 release window was missed.
              '7.13.1': (state) => {
                const lensState = state as unknown as { attributes: LensDocShapePre712 };
                const migratedLensState = commonRenameOperationsForFormula(lensState.attributes);
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '7.14.0': (state) => {
                const lensState = state as unknown as { attributes: LensDocShape713 };
                const migratedLensState = commonRemoveTimezoneDateHistogramParam(
                  lensState.attributes
                );
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '7.15.0': (state) => {
                const lensState = state as unknown as {
                  attributes: LensDocShape715<VisStatePre715>;
                };
                const migratedLensState = commonUpdateVisLayerType(lensState.attributes);
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '7.16.0': (state) => {
                const lensState = state as unknown as { attributes: LensDocShape715<VisState716> };
                const migratedLensState = commonMakeReversePaletteAsCustom(lensState.attributes);
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.1.0': (state) => {
                const lensState = state as unknown as { attributes: LensDocShape715 };
                const migratedLensState = commonRenameRecordsField(
                  commonRenameFilterReferences(lensState.attributes)
                );
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.2.0': (state) => {
                const lensState = state as unknown as {
                  attributes: LensDocShape810<VisState810>;
                };
                let migratedLensState = commonSetLastValueShowArrayValues(lensState.attributes);
                migratedLensState = commonEnhanceTableRowHeight(
                  migratedLensState as LensDocShape810<VisState810>
                );
                migratedLensState = commonSetIncludeEmptyRowsDateHistogram(migratedLensState);

                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.3.0': (state) => {
                const lensState = state as unknown as { attributes: LensDocShape810<VisState810> };
                let migratedLensState = commonLockOldMetricVisSettings(lensState.attributes);
                migratedLensState = commonPreserveOldLegendSizeDefault(migratedLensState);
                migratedLensState = commonFixValueLabelsInXY(
                  migratedLensState as LensDocShape810<VisStatePre830>
                );
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.5.0': (state) => {
                const lensState = state as unknown as {
                  attributes: LensDocShape850<VisState850>;
                };

                let migratedLensState = commonMigrateMetricIds(lensState.attributes);
                migratedLensState = commonEnrichAnnotationLayer(
                  migratedLensState as LensDocShape850<XYVisState850>
                );
                migratedLensState = commonMigratePartitionChartGroups(
                  migratedLensState as LensDocShape850<{
                    shape: string;
                    layers: Array<{ groups?: string[] }>;
                  }>
                );
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.6.0': (state) => {
                const lensState = state as unknown as SavedObject<LensDocShape850<VisState850>>;

                let migratedLensState = commonMigrateIndexPatternDatasource(lensState.attributes);
                migratedLensState = commonMigratePartitionMetrics(migratedLensState);
                return {
                  ...lensState,
                  attributes: migratedLensState,
                } as unknown as SerializableRecord;
              },
              '8.9.0': (state) => {
                const lensState = state as unknown as SavedObject<LensDocShape860>;
                return {
                  ...lensState,
                  attributes: commonMigrateMetricFormatter(lensState.attributes),
                } as unknown as SerializableRecord;
              },
              // FOLLOW THESE GUIDELINES IF YOU ARE ADDING A NEW MIGRATION!
              // 1. Make sure you are applying migrations for a given version in the same order here as they are applied in x-pack/plugins/lens/server/migrations/saved_object_migrations.ts
            }),
            getLensCustomVisualizationMigrations(customVisualizationMigrations)
          ),
          getLensDataViewMigrations(getDataViewMigrations())
        ),
      extract,
      inject,
      getSchema,
    };
  };
