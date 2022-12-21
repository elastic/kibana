/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ALERT_RULE_PRODUCER, ALERT_STATUS } from '@kbn/rule-data-utils';
import {
  AggregationsCardinalityAggregate,
  AggregationsFilterAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/core/server';
import { ApmPluginRequestHandlerContext } from '../typings';
import { SavedServiceGroup } from '../../../common/service_groups';
import { ApmAlertsClient } from './get_apm_alerts_client';

export async function getServiceGroupAlerts({
  serviceGroups,
  apmAlertsClient,
  context,
  logger,
  spaceId,
}: {
  serviceGroups: SavedServiceGroup[];
  apmAlertsClient: ApmAlertsClient;
  context: ApmPluginRequestHandlerContext;
  logger: Logger;
  spaceId?: string;
}) {
  if (!spaceId || serviceGroups.length === 0) {
    return {};
  }
  const serviceGroupsKueryMap: Record<string, QueryDslQueryContainer> =
    serviceGroups.reduce((acc, sg) => {
      return {
        ...acc,
        [sg.id]: kqlQuery(sg.kuery)[0],
      };
    }, {});
  const params = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [ALERT_RULE_PRODUCER]: 'apm' } },
          { term: { [ALERT_STATUS]: 'active' } },
        ],
      },
    },
    aggs: {
      service_groups: {
        filters: {
          filters: serviceGroupsKueryMap,
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: 'kibana.alert.uuid',
            },
          },
        },
      },
    },
  };
  const result = await apmAlertsClient.search(params);

  interface ServiceGroupsAggResponse {
    buckets: Record<
      string,
      AggregationsFilterAggregate & {
        alerts_count: AggregationsCardinalityAggregate;
      }
    >;
  }

  const { buckets: filterAggBuckets } = (result.aggregations
    ?.service_groups ?? { buckets: {} }) as ServiceGroupsAggResponse;

  const serviceGroupAlertsCount: Record<string, number> = Object.keys(
    filterAggBuckets
  ).reduce((acc, serviceGroupId) => {
    return {
      ...acc,
      [serviceGroupId]: filterAggBuckets[serviceGroupId].alerts_count.value,
    };
  }, {});

  return serviceGroupAlertsCount;
}
