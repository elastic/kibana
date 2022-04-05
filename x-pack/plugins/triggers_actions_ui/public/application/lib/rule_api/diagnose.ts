/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { DiagnoseOutput, DiagnosticResult } from '../../../../../alerting/common';
import { RewriteResponseCase } from '../../../../../actions/common';
import { Rule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type PartialRule = Partial<Rule>;
const rewriteBodyRequest: RewriteResponseCase<PartialRule> = ({ ruleTypeId, ...res }): any => ({
  ...res,
  rule_type_id: ruleTypeId,
});

export async function diagnoseRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: PartialRule;
}): Promise<DiagnoseOutput> {
  const output: DiagnoseOutput = {
    requestAndResponses: {
      requests: [
        {
          index: ['es-apm-sys-sim'],
          body: {
            size: 0,
            query: {
              bool: {
                filter: {
                  range: {
                    '@timestamp': {
                      gte: '2022-04-05T15:14:30.346Z',
                      lt: '2022-04-05T15:19:30.346Z',
                      format: 'strict_date_time',
                    },
                  },
                },
              },
            },
            aggs: {
              groupAgg: {
                terms: {
                  field: 'host.name.keyword',
                  size: 6,
                  order: {
                    sortValueAgg: 'desc',
                  },
                },
                aggs: {
                  dateAgg: {
                    date_range: {
                      field: '@timestamp',
                      format: 'strict_date_time',
                      ranges: [
                        {
                          from: '2022-04-05T15:14:30.346Z',
                          to: '2022-04-05T15:19:30.346Z',
                        },
                      ],
                    },
                    aggs: {
                      metricAgg: {
                        avg: {
                          field: 'system.cpu.total.norm.pct',
                        },
                      },
                    },
                  },
                  sortValueAgg: {
                    avg: {
                      field: 'system.cpu.total.norm.pct',
                    },
                  },
                },
              },
            },
          },
          ignore_unavailable: true,
          allow_no_indices: true,
        },
      ],
      responses: [
        {
          took: 0,
          timed_out: false,
          _shards: {
            total: 0,
            successful: 0,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: 0,
            hits: [],
          },
        },
      ],
    },
    errorsAndWarnings: [
      {
        type: 'warning',
        name: 'Index exists error',
        message: 'Index es-apm-sys-sim does not exist',
      },
      {
        type: 'error',
        name: 'Index access error',
        message:
          'Unable to query index es-apm-sys-sim as user elastic - index_not_found_exception: [index_not_found_exception] Reason: no such index [es-apm-sys-sim]',
      },
    ],
  };

  return new Promise((resolve) => resolve(output));

  // if (rule.id) {
  //   return await http.get(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${rule.id}/_diagnose`);
  // } else {
  //   return await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_preview`, {
  //     body: JSON.stringify(rewriteBodyRequest(rule)),
  //   });
  // }
}
