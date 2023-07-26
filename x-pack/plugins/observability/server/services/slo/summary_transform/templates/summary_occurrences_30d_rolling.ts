/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION,
  SLO_SUMMARY_DESTINATION_INDEX_NAME,
  SLO_SUMMARY_INGEST_PIPELINE_NAME,
  SLO_SUMMARY_TRANSFORM_NAME_PREFIX,
} from '../../../../assets/constants';
import { groupBy } from './common';

export const SUMMARY_OCCURRENCES_30D_ROLLING: TransformPutTransformRequest = {
  transform_id: `${SLO_SUMMARY_TRANSFORM_NAME_PREFIX}occurrences-30d-rolling`,
  dest: {
    index: SLO_SUMMARY_DESTINATION_INDEX_NAME,
    pipeline: SLO_SUMMARY_INGEST_PIPELINE_NAME,
  },
  source: {
    index: SLO_DESTINATION_INDEX_PATTERN,
    runtime_mappings: {
      errorBudgetEstimated: {
        type: 'boolean',
        script: 'emit(false)',
      },
      isTempDoc: {
        type: 'boolean',
        script: 'emit(false)',
      },
    },
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 'now-30d/m',
                lte: 'now/m',
              },
            },
          },
          {
            term: {
              'slo.budgetingMethod': 'occurrences',
            },
          },
          {
            term: {
              'slo.timeWindow.type': 'rolling',
            },
          },
          {
            term: {
              'slo.timeWindow.duration': '30d',
            },
          },
        ],
      },
    },
  },
  pivot: {
    group_by: groupBy,
    aggregations: {
      goodEvents: {
        sum: {
          field: 'slo.numerator',
        },
      },
      totalEvents: {
        sum: {
          field: 'slo.denominator',
        },
      },
      _objectiveTarget: {
        max: {
          field: 'slo.objective.target',
        },
      },
      sliValue: {
        bucket_script: {
          buckets_path: {
            goodEvents: 'goodEvents',
            totalEvents: 'totalEvents',
          },
          script:
            'if (params.totalEvents == 0) { return -1 } else { return params.goodEvents / params.totalEvents }',
        },
      },
      errorBudgetInitial: {
        bucket_script: {
          buckets_path: {
            objectiveTarget: '_objectiveTarget',
          },
          script: '1 - params.objectiveTarget',
        },
      },
      errorBudgetConsumed: {
        bucket_script: {
          buckets_path: {
            sliValue: 'sliValue',
            errorBudgetInitial: 'errorBudgetInitial',
          },
          script:
            'if (params.sliValue == -1) { return 0 } else { return (1 - params.sliValue) / params.errorBudgetInitial }',
        },
      },
      errorBudgetRemaining: {
        bucket_script: {
          buckets_path: {
            errorBudgetConsummed: 'errorBudgetConsumed',
          },
          script: '1 - params.errorBudgetConsummed',
        },
      },
      statusCode: {
        bucket_script: {
          buckets_path: {
            sliValue: 'sliValue',
            objectiveTarget: '_objectiveTarget',
            errorBudgetRemaining: 'errorBudgetRemaining',
          },
          script: {
            source:
              'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= params.objectiveTarget) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
          },
        },
      },
    },
  },
  description:
    'Summarize every SLO with occurrences budgeting method and a 30 days rolling time window',
  frequency: '1m',
  sync: {
    time: {
      field: '@timestamp',
      delay: '125s',
    },
  },
  settings: {
    deduce_mappings: false,
    max_page_search_size: 8000,
  },
  _meta: {
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};
