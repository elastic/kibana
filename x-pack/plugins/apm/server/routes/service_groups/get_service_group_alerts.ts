/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import {
  AggregationsCardinalityAggregate,
  AggregationsFilterAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/core/server';
import { ApmPluginRequestHandlerContext } from '../typings';
import { SavedServiceGroup } from '../../../common/service_groups';

export async function getServiceGroupAlerts({
  serviceGroups,
  authorizedAlertsIndices,
  context,
  logger,
  spaceId,
}: {
  serviceGroups: SavedServiceGroup[];
  authorizedAlertsIndices?: string[];
  context: ApmPluginRequestHandlerContext;
  logger: Logger;
  spaceId?: string;
}) {
  if (
    !spaceId ||
    !authorizedAlertsIndices ||
    authorizedAlertsIndices.length === 0 ||
    serviceGroups.length === 0
  ) {
    return {};
  }
  const serviceGroupsKueryMap: Record<string, QueryDslQueryContainer> =
    serviceGroups.reduce((acc, sg) => {
      return {
        ...acc,
        [sg.id]: kqlQuery(sg.kuery)[0],
      };
    }, {});
  const esClient = (await context.core).elasticsearch.client;
  const securityHasPrivilegesResponse =
    await esClient.asCurrentUser.security.hasPrivileges({
      body: {
        index: [
          {
            names: authorizedAlertsIndices, // ['.alerts-observability.apm.alerts-default']
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
    });

  if (!securityHasPrivilegesResponse.has_all_requested) {
    logger.debug('User must have read privileges for APM alerts.');
    return {};
  }
  const params = {
    index: authorizedAlertsIndices,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.producer': 'apm' } },
          { term: { 'kibana.alert.status': 'active' } },
          { term: { 'kibana.space_ids': spaceId } },
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
  const result = await esClient.asInternalUser.search(params);

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
