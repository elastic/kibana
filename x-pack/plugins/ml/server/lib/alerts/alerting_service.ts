/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlClient } from '../ml_client';
import { MlAnomalyThresholdAlertParams } from '../../routes/schemas/alerting_schema';
import { ANOMALY_RESULT_TYPE } from '../../../common/constants/anomalies';

export function alertingServiceProvider(mlClient: MlClient) {
  return {
    preview: async (params: MlAnomalyThresholdAlertParams) => {
      const jobIds = params.jobSelection.jobIds;

      const resultTypes = new Set(params.resultTypes);

      const requestBody = {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  timestamp: {
                    gte: null,
                  },
                },
              },
              {
                terms: {
                  result_type: params.resultTypes,
                },
              },
            ],
          },
        },
        aggs: {
          ...(resultTypes.has(ANOMALY_RESULT_TYPE.INFLUENCER)
            ? {
                influencer_results: {
                  filter: {
                    range: {
                      influencer_score: {
                        gte: params.severity,
                      },
                    },
                  },
                  aggs: {
                    top_influencer_hits: {
                      top_hits: {
                        sort: [
                          {
                            influencer_score: {
                              order: 'desc',
                            },
                          },
                        ],
                        _source: {
                          includes: [
                            'result_type',
                            'timestamp',
                            'influencer_field_name',
                            'influencer_field_value',
                            'influencer_score',
                            'isInterim',
                          ],
                        },
                        size: 3,
                        script_fields: {
                          score: {
                            script: {
                              lang: 'painless',
                              source: 'Math.round(doc["influencer_score"].value)',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              }
            : {}),
          ...(resultTypes.has(ANOMALY_RESULT_TYPE.RECORD)
            ? {
                record_results: {
                  filter: {
                    range: {
                      record_score: {
                        gte: params.severity,
                      },
                    },
                  },
                  aggs: {
                    top_record_hits: {
                      top_hits: {
                        sort: [
                          {
                            record_score: {
                              order: 'desc',
                            },
                          },
                        ],
                        _source: {
                          includes: [
                            'result_type',
                            'timestamp',
                            'record_score',
                            'is_interim',
                            'function',
                            'field_name',
                            'by_field_value',
                            'over_field_value',
                            'partition_field_value',
                          ],
                        },
                        size: 3,
                        script_fields: {
                          score: {
                            script: {
                              lang: 'painless',
                              source: 'Math.round(doc["record_score"].value)',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              }
            : {}),
          ...(resultTypes.has(ANOMALY_RESULT_TYPE.BUCKET)
            ? {
                bucket_results: {
                  filter: {
                    range: {
                      anomaly_score: {
                        gte: null,
                      },
                    },
                  },
                  aggs: {
                    top_bucket_hits: {
                      top_hits: {
                        sort: [
                          {
                            anomaly_score: {
                              order: 'desc',
                            },
                          },
                        ],
                        _source: {
                          includes: [
                            'job_id',
                            'result_type',
                            'timestamp',
                            'anomaly_score',
                            'is_interim',
                          ],
                        },
                        size: 1,
                        script_fields: {
                          start: {
                            script: {
                              lang: 'painless',
                              source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()-((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
                              params: {
                                padding: 10,
                              },
                            },
                          },
                          end: {
                            script: {
                              lang: 'painless',
                              source: `LocalDateTime.ofEpochSecond((doc["timestamp"].value.getMillis()+((doc["bucket_span"].value * 1000)
 * params.padding)) / 1000, 0, ZoneOffset.UTC).toString()+\":00.000Z\"`,
                              params: {
                                padding: 10,
                              },
                            },
                          },
                          timestamp_epoch: {
                            script: {
                              lang: 'painless',
                              source: 'doc["timestamp"].value.getMillis()/1000',
                            },
                          },
                          timestamp_iso8601: {
                            script: {
                              lang: 'painless',
                              source: 'doc["timestamp"].value',
                            },
                          },
                          score: {
                            script: {
                              lang: 'painless',
                              source: 'Math.round(doc["anomaly_score"].value)',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              }
            : {}),
        },
      };

      const response = await mlClient.anomalySearch(
        {
          body: requestBody,
        },
        jobIds!
      );

      const result = response.body.aggregations;

      return result;
    },
  };
}
