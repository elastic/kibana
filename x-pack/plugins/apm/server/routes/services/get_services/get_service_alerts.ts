/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCardinalityAggregate,
  AggregationsFilterAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ServiceGroup } from '../../../../common/service_groups';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { serviceGroupQuery } from '../../../lib/service_group_query';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';

interface ServiceAggResponse {
  buckets: Array<
    AggregationsFilterAggregate & {
      key: string;
      alerts_count: AggregationsCardinalityAggregate;
    }
  >;
}

export async function getServicesAlerts({
  apmAlertsClient,
  kuery,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceGroup,
  serviceName,
}: {
  apmAlertsClient: ApmAlertsClient;
  kuery?: string;
  maxNumServices?: number;
  serviceGroup?: ServiceGroup | null;
  serviceName?: string;
}) {
  const params = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [ALERT_RULE_PRODUCER]: 'apm' } },
          { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
          ...kqlQuery(kuery),
          ...serviceGroupQuery(serviceGroup),
          ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
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
        },
      },
    },
  };

  const result = await apmAlertsClient.search(params);

  const { buckets: filterAggBuckets } = (result.aggregations?.services ?? {
    buckets: [],
  }) as ServiceAggResponse;

  const servicesAlertsCount: Array<{
    serviceName: string;
    alertsCount: number;
  }> = filterAggBuckets.map((bucket) => ({
    serviceName: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));

  return servicesAlertsCount;
}
