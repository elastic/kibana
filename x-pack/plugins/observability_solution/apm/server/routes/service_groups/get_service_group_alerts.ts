/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ALERT_RULE_PRODUCER, ALERT_STATUS } from '@kbn/rule-data-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/core/server';
import { ApmPluginRequestHandlerContext } from '../typings';
import { SavedServiceGroup } from '../../../common/service_groups';
import { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';

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
  const serviceGroupsKueryMap = serviceGroups.reduce<Record<string, QueryDslQueryContainer>>(
    (acc, sg) => {
      acc[sg.id] = kqlQuery(sg.kuery)[0];
      return acc;
    },
    {}
  );
  const params = {
    size: 0,
    track_total_hits: false,
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

  const filterAggBuckets = result.aggregations?.service_groups.buckets ?? {};

  const serviceGroupAlertsCount = Object.keys(filterAggBuckets).reduce<Record<string, number>>(
    (acc, serviceGroupId) => {
      acc[serviceGroupId] = filterAggBuckets[serviceGroupId].alerts_count.value;
      return acc;
    },
    {}
  );

  return serviceGroupAlertsCount;
}
