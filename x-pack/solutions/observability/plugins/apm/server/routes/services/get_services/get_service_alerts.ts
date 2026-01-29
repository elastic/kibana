/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery, rangeQuery, wildcardQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_ACTION_GROUP,
  ALERT_SEVERITY,
  ALERT_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { ServiceAlertsSeverity } from '../../../../common/service_inventory';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';

export type ServiceAlertsResponse = Array<{
  serviceName: string;
  alertsCount: number;
  severity: ServiceAlertsSeverity;
}>;

export async function getServicesAlerts({
  apmAlertsClient,
  kuery,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceGroup,
  serviceName,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  kuery?: string;
  maxNumServices?: number;
  serviceGroup?: ServiceGroup | null;
  serviceName?: string;
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceAlertsResponse> {
  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, end),
          ...kqlQuery(kuery),
          ...serviceGroupWithOverflowQuery(serviceGroup),
          ...termQuery(SERVICE_NAME, serviceName),
          ...wildcardQuery(SERVICE_NAME, searchQuery),
          ...environmentQuery(environment),
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: maxNumServices,
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
          critical_alerts: {
            filter: {
              bool: {
                should: [
                  // SLO burn rate alert (Critical action group)
                  {
                    bool: {
                      must: [
                        { term: { [ALERT_RULE_TYPE_ID]: 'slo.rules.burnRate' } },
                        { term: { [ALERT_ACTION_GROUP]: 'slo.burnRate.alert' } },
                      ],
                    },
                  },
                  // Anomaly alerts with critical or major severity
                  {
                    bool: {
                      must: [
                        { term: { [ALERT_RULE_TYPE_ID]: 'apm.anomaly' } },
                        { terms: { [ALERT_SEVERITY]: ['critical', 'major'] } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              count: {
                cardinality: {
                  field: ALERT_UUID,
                },
              },
            },
          },
          warning_alerts: {
            filter: {
              bool: {
                should: [
                  // SLO burn rate alerts (High/Medium/Low action groups)
                  {
                    bool: {
                      must: [
                        { term: { [ALERT_RULE_TYPE_ID]: 'slo.rules.burnRate' } },
                        {
                          terms: {
                            [ALERT_ACTION_GROUP]: [
                              'slo.burnRate.high',
                              'slo.burnRate.medium',
                              'slo.burnRate.low',
                            ],
                          },
                        },
                      ],
                    },
                  },
                  // Anomaly alerts with minor or warning severity
                  {
                    bool: {
                      must: [
                        { term: { [ALERT_RULE_TYPE_ID]: 'apm.anomaly' } },
                        { terms: { [ALERT_SEVERITY]: ['minor', 'warning'] } },
                      ],
                    },
                  },
                  // APM threshold alerts (transaction duration, error count, transaction error rate)
                  {
                    terms: {
                      [ALERT_RULE_TYPE_ID]: [
                        'apm.transaction_duration',
                        'apm.error_count',
                        'apm.transaction_error_rate',
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              count: {
                cardinality: {
                  field: ALERT_UUID,
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await apmAlertsClient.search(params);

  const filterAggBuckets = result.aggregations?.services.buckets ?? [];

  const servicesAlertsCount: ServiceAlertsResponse = filterAggBuckets.map((bucket) => ({
    serviceName: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
    severity: {
      critical: bucket.critical_alerts.count.value,
      warning: bucket.warning_alerts.count.value,
    },
  }));

  return servicesAlertsCount;
}
