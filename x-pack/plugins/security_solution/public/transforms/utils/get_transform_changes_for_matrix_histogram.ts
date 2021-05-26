/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MatrixHistogramQuery,
  MatrixHistogramQueryEntities,
  MatrixHistogramType,
} from '../../../common/search_strategy';
import { createIndicesFromPrefix } from './create_indices_from_prefix';
import { GetTransformChanges } from './types';

export const getTransformChangesForMatrixHistogram: GetTransformChanges = ({
  factoryQueryType,
  settings,
  histogramType,
}) => {
  switch (factoryQueryType) {
    case MatrixHistogramQuery: {
      switch (histogramType) {
        case MatrixHistogramType.authentications: {
          return {
            indices: createIndicesFromPrefix({
              prefix: settings.prefix,
              transformIndices: ['user_met*'],
            }),
            factoryQueryType: MatrixHistogramQueryEntities,
            histogramType: MatrixHistogramType.authenticationsEntities,
          };
        }
        default: {
          return undefined;
        }
      }
    }
    default: {
      return undefined;
    }
  }
};
