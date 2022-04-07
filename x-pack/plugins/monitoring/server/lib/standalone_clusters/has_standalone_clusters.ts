/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get } from 'lodash';
import { LegacyRequest } from '../../types';
import { standaloneClusterFilter } from './';
import { Globals } from '../../static_globals';
import { getLegacyIndexPattern, getNewIndexPatterns } from '../cluster/get_index_patterns';

export async function hasStandaloneClusters(req: LegacyRequest, ccs: string[]) {
  const lsIndexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'logstash',
    ccs,
  });
  // use legacy because no integration exists for beats
  const beatsIndexPatterns = getLegacyIndexPattern({
    moduleType: 'beats',
    config: Globals.app.config,
    ccs,
  });
  const indexPatterns = [lsIndexPatterns, beatsIndexPatterns];
  const indexPatternList = indexPatterns.reduce((list, patterns) => {
    list.push(...patterns.split(','));
    return list;
  }, [] as string[]);

  const filters: any[] = [
    standaloneClusterFilter,
    {
      bool: {
        should: [
          {
            terms: {
              type: ['logstash_stats', 'logstash_state', 'beats_stats', 'beats_state'],
            },
          },
          {
            terms: {
              'metricset.name': ['node', 'node_stats', 'stats', 'state'],
            },
          },
          {
            terms: {
              'data_stream.dataset': ['node', 'node_stats', 'stats', 'state'],
            },
          },
        ],
      },
    },
  ];
  // Not every page will contain a time range so check for that
  if (req.payload.timeRange) {
    const start = req.payload.timeRange.min;
    const end = req.payload.timeRange.max;

    const timeRangeFilter: { range: { timestamp: Record<string, any> } } = {
      range: {
        timestamp: {
          format: 'epoch_millis',
        },
      },
    };

    if (start) {
      timeRangeFilter.range.timestamp.gte = moment.utc(start).valueOf();
    }
    if (end) {
      timeRangeFilter.range.timestamp.lte = moment.utc(end).valueOf();
    }
    filters.push(timeRangeFilter);
  }

  const params = {
    index: indexPatternList,
    body: {
      size: 0,
      terminate_after: 1,
      query: {
        bool: {
          filter: filters,
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  if (response && response.hits) {
    return get(response, 'hits.total.value', 0) > 0;
  }
  return false;
}
