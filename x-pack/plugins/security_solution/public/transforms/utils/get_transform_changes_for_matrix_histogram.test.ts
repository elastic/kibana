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
import { TransformConfigSchema } from '../../../common/transforms/types';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';

/** Get the return type of getTransformChangesForMatrixHistogram for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForMatrixHistogram = ReturnType<
  typeof getTransformChangesForMatrixHistogram
>;

describe('get_transform_changes_for_matrix_histogram', () => {
  const mockTransformSetting: TransformConfigSchema['settings'][0] = {
    prefix: 'all',
    indices: ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
    data_sources: [
      ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
      ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
      ['auditbeat-*'],
    ],
  };

  test('it gets a transform change for authentications', () => {
    expect(
      getTransformChangesForMatrixHistogram({
        factoryQueryType: MatrixHistogramQuery,
        histogramType: MatrixHistogramType.authentications,
        settings: mockTransformSetting,
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
        settings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeGetTransformChangesForMatrixHistogram>(undefined);
  });
});
