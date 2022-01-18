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
  commonMakeReversePaletteAsCustom,
  commonRemoveTimezoneDateHistogramParam,
  commonRenameFilterReferences,
  commonRenameOperationsForFormula,
  commonUpdateVisLayerType,
  getLensFilterMigrations,
} from '../migrations/common_migrations';
import {
  LensDocShape713,
  LensDocShape715,
  LensDocShapePre712,
  VisState716,
  VisStatePre715,
} from '../migrations/types';
import { extract, inject } from '../../common/embeddable_factory';

export const makeLensEmbeddableFactory =
  (getFilterMigrations: () => MigrateFunctionsObject) => (): EmbeddableRegistryDefinition => {
    return {
      id: DOC_TYPE,
      // TODO - embeddable factory migrations should accept a function that evaluates to a MigrationFunctionMap like we allow for saved object definitions.
      // https://github.com/elastic/kibana/issues/123309
      migrations: mergeMigrationFunctionMaps(getLensFilterMigrations(getFilterMigrations()), {
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
          const migratedLensState = commonRemoveTimezoneDateHistogramParam(lensState.attributes);
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
          const lensState = state as unknown as { attributes: LensDocShape715<VisState716> };
          const migratedLensState = commonRenameFilterReferences(lensState.attributes);
          return {
            ...lensState,
            attributes: migratedLensState,
          } as unknown as SerializableRecord;
        },
      }),
      extract,
      inject,
    };
  };
