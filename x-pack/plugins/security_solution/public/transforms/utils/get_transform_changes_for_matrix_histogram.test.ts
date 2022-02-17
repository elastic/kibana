/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MatrixHistogramType,
  MatrixHistogramQuery,
  MatrixHistogramQueryEntities,
} from '../../../common/search_strategy';
import { getTransformChangesForMatrixHistogram } from './get_transform_changes_for_matrix_histogram';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of getTransformChangesForMatrixHistogram for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForMatrixHistogram = ReturnType<
  typeof getTransformChangesForMatrixHistogram
>;

describe('get_transform_changes_for_matrix_histogram', () => {
  test('it gets a transform change for authentications', () => {
    expect(
      getTransformChangesForMatrixHistogram({
        factoryQueryType: MatrixHistogramQuery,
        histogramType: MatrixHistogramType.authentications,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForMatrixHistogram>({
      histogramType: MatrixHistogramType.authenticationsEntities,
      factoryQueryType: MatrixHistogramQueryEntities,
      indices: ['.estc_all_user_met*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForMatrixHistogram({
        factoryQueryType: HostsQueries.firstOrLastSeen,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForMatrixHistogram>(undefined);
  });
});
