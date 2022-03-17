/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
} from '../../../../../src/plugins/kibana_utils/common';
import { DOC_TYPE } from '../../common';
import {
  commonEnhanceTableRowHeight,
  commonMakeReversePaletteAsCustom,
  commonRemoveTimezoneDateHistogramParam,
  commonRenameFilterReferences,
  commonRenameOperationsForFormula,
  commonRenameRecordsField,
  commonSetLastValueShowArrayValues,
  commonUpdateVisLayerType,
  getLensCustomVisualizationMigrations,
  getLensFilterMigrations,
} from '../migrations/common_migrations';
import {
  CustomVisualizationMigrations,
  LensDocShape713,
  LensDocShape715,
  LensDocShape810,
  LensDocShapePre712,
  VisState716,
  VisState810,
  VisStatePre715,
} from '../migrations/types';
import { extract, inject } from '../../common/embeddable_factory';

export const makeLensEmbeddableFactory =
  (
    getFilterMigrations: () => MigrateFunctionsObject,
    customVisualizationMigrations: CustomVisualizationMigrations
  ) =>
  (): EmbeddableRegistryDefinition => {
    return {
      id: DOC_TYPE,
      migrations: () =>
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
              const lensState = state as unknown as { attributes: LensDocShape715<VisStatePre715> };
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
              const lensState = state as unknown as { attributes: LensDocShape810<VisState810> };
              let migratedLensState = commonSetLastValueShowArrayValues(lensState.attributes);
              migratedLensState = commonEnhanceTableRowHeight(lensState.attributes);
              return {
                ...lensState,
                attributes: migratedLensState,
              } as unknown as SerializableRecord;
            },
          }),
          getLensCustomVisualizationMigrations(customVisualizationMigrations)
        ),
      extract,
      inject,
    };
  };
