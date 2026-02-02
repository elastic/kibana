/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery, existsQuery } from '@kbn/observability-plugin/server';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { SavedServiceGroup } from '../../../common/service_groups';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { SERVICE_NAME } from '../../../common/es_fields/apm';

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
        filter: [...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE), ...existsQuery(SERVICE_NAME)],
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
