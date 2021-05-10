/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { NetworkKpiHistogramData } from '../../../../../../../common/search_strategy/security_solution/network';

export const getIpFilter = () => [
  {
    bool: {
      should: [
        {
          exists: {
            field: 'source.ip',
          },
        },
        {
          exists: {
            field: 'destination.ip',
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const formatHistogramData = (
  data: Array<{ key: number; count: { value: number } }>
): NetworkKpiHistogramData[] | null =>
  data && data.length > 0
    ? data.map<NetworkKpiHistogramData>(({ key, count }) => ({
        x: key,
        y: getOr(null, 'value', count),
      }))
    : null;
