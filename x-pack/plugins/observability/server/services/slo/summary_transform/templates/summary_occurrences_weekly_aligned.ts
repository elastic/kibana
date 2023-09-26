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

export const SUMMARY_OCCURRENCES_WEEKLY_ALIGNED: TransformPutTransformRequest = {
  transform_id: `${SLO_SUMMARY_TRANSFORM_NAME_PREFIX}occurrences-weekly-aligned`,
  dest: {
    index: SLO_SUMMARY_DESTINATION_INDEX_NAME,
    pipeline: SLO_SUMMARY_INGEST_PIPELINE_NAME,
  },
  source: {
    index: SLO_DESTINATION_INDEX_PATTERN,
    runtime_mappings: {
      errorBudgetEstimated: {
        type: 'boolean',
        script: 'emit(true)',
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
                gte: 'now/w',
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
              'slo.timeWindow.type': 'calendarAligned',
            },
          },
          {
            term: {
              'slo.timeWindow.duration': '1w',
            },
          },
        ],
      },
    },
  },
  pivot: {
    group_by: groupBy,
    aggregations: {
      _objectiveTarget: {
        max: {
          field: 'slo.objective.target',
        },
      },
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
      sliValue: {
        bucket_script: {
          buckets_path: {
            goodEvents: 'goodEvents',
            totalEvents: 'totalEvents',
          },
          script:
            'if (params.totalEvents == 0) { return -1 } else if (params.goodEvents >= params.totalEvents) { return 1 } else { return params.goodEvents / params.totalEvents }',
        },
      },
      errorBudgetInitial: {
        bucket_script: {
          buckets_path: {
            objective: '_objectiveTarget',
          },
          script: '1 - params.objective',
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
            errorBudgetConsumed: 'errorBudgetConsumed',
          },
          script: '1 - params.errorBudgetConsumed',
        },
      },
      statusCode: {
        bucket_script: {
          buckets_path: {
            sliValue: 'sliValue',
            objective: '_objectiveTarget',
            errorBudgetRemaining: 'errorBudgetRemaining',
          },
          script:
            'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= params.objective) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
        },
      },
    },
  },
  description:
    'Summarize every SLO with occurrences budgeting method and a weekly calendar aligned time window',
  frequency: '1m',
  sync: {
    time: {
      field: '@timestamp',
      delay: '125s',
    },
  },
  settings: {
    deduce_mappings: false,
  },
  _meta: {
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};
