/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery, termsQuery } from '../../../../observability/server';
import {
  ApmMlDetectorType,
  getApmMlDetectorIndex,
} from '../../../common/anomaly_detection/apm_ml_detectors';

export function apmMlAnomalyQuery({
  serviceName,
  transactionType,
  detectorTypes,
}: {
  serviceName?: string;
  detectorTypes?: ApmMlDetectorType[];
  transactionType?: string;
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      ...termQuery('is_interim', false),
                      ...termQuery('result_type', 'record'),
                    ],
                  },
                },
                {
                  bool: {
                    filter: termQuery('result_type', 'model_plot'),
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          ...termsQuery(
            'detector_index',
            ...(detectorTypes?.map((type) => getApmMlDetectorIndex(type)) ?? [])
          ),
          ...termQuery('partition_field_value', serviceName),
          ...termQuery('by_field_value', transactionType),
        ],
      },
    },
  ] as QueryDslQueryContainer[];
}
