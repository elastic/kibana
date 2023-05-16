/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';

import {
  getSLOSummaryTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_SUMMARY_INDEX_NAME,
} from '../../../assets/constants';
import { SLO } from '../../../domain/models';

export interface SummaryTransformGenerator {
  generate(slo: SLO): TransformPutTransformRequest;
}

export class DefaultSummaryTransformGenerator implements SummaryTransformGenerator {
  generate(slo: SLO): TransformPutTransformRequest {
    return {
      transform_id: getSLOSummaryTransformId(slo.id, slo.revision),
      description: `Summary data for SLO: ${slo.name}`,
      source: {
        index: `${SLO_DESTINATION_INDEX_NAME}*`,
        runtime_mappings: {
          objective: {
            type: 'double',
            script: {
              source: `emit(${slo.objective.target})`,
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  'slo.id': slo.id,
                },
              },
              {
                term: {
                  'slo.revision': slo.revision,
                },
              },
              {
                range: {
                  ...(rollingTimeWindowSchema.is(slo.timeWindow) && {
                    '@timestamp': {
                      gte: `now-${slo.timeWindow.duration.format()}/m`,
                      lte: 'now/m',
                    },
                  }),
                  ...(calendarAlignedTimeWindowSchema.is(slo.timeWindow) && {
                    '@timestamp': {
                      gte: `now/${slo.timeWindow.duration.unit}`,
                      lte: `now+${slo.timeWindow.duration.format()}/${
                        slo.timeWindow.duration.unit
                      }`, // now + 1w/w or now + 1M/M
                    },
                  }),
                },
              },
            ],
          },
        },
      },
      pivot: {
        group_by: {
          'slo.id': {
            terms: {
              field: 'slo.id',
            },
          },
          'slo.revision': {
            terms: {
              field: 'slo.revision',
            },
          },
        },
        aggregations: {
          period: {
            range: {
              field: '@timestamp',
              keyed: true,
              ranges: [
                {
                  key: 'last',
                },
              ],
            },
            aggs: {
              ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
                good_events: {
                  sum: {
                    field: 'slo.numerator',
                  },
                },
                total_events: {
                  sum: {
                    field: 'slo.denominator',
                  },
                },
              }),
              ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
                good_events: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total_events: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              }),
              objective: {
                max: {
                  field: 'objective',
                },
              },
              sli_value: {
                bucket_script: {
                  buckets_path: {
                    goodEvents: 'good_events',
                    totalEvents: 'total_events',
                  },
                  // handle totalEvents === 0 => return no_data (-1)
                  script: 'params.goodEvents / params.totalEvents',
                },
              },
              error_budget_initial: {
                bucket_script: {
                  buckets_path: {
                    objective: 'objective',
                  },
                  script: '1 - params.objective',
                },
              },
              error_budget_consumed: {
                bucket_script: {
                  buckets_path: {
                    sli_value: 'sli_value',
                    objective: 'objective',
                  },
                  // handle sli_value = -1
                  script: '(1 - params.sli_value) / (1 - params.objective)',
                },
              },
              error_budget_remaining: {
                bucket_script: {
                  buckets_path: {
                    sli_value: 'sli_value',
                    objective: 'objective',
                  },
                  // handle sli_value = -1
                  script: '1 - (1 - params.sli_value) / (1 - params.objective)',
                },
              },
              status: {
                bucket_script: {
                  buckets_path: {
                    sli_value: 'sli_value',
                    objective: 'objective',
                    error_budget_remaining: 'error_budget_remaining',
                  },
                  // handle sli_value = -1
                  script:
                    'if (params.sli_value >= params.objective) { return 4 } else if (params.error_budget_remaining > 0) { return 2 } else { return 1 }',
                },
              },
            },
          },
        },
      },
      dest: { index: SLO_SUMMARY_INDEX_NAME },
      frequency: '1m',
      sync: {
        time: {
          field: '@timestamp',
          delay: '60s',
        },
      },
      settings: {
        deduce_mappings: false,
      },
      _meta: {
        version: 1,
        managed: true,
        managed_by: 'observability',
      },
    };
  }
}
