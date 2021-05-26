/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';
import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import { SerializableState } from '../../../../../src/plugins/kibana_utils/common';
import { DOC_TYPE } from '../../common';
import { commonRenameOperationsForFormula } from '../migrations/attribute_migrations';
import { LensDocShapePre712 } from '../migrations/types';

export const lensEmbeddableFactory = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddableRegistryDefinition => {
  return {
    id: DOC_TYPE,
    migrations: {
      '7.13.0': (state) =>
        (commonRenameOperationsForFormula(
          (state as unknown) as { attributes: LensDocShapePre712 }
        ) as unknown) as SerializableState,
    },
  };
};
