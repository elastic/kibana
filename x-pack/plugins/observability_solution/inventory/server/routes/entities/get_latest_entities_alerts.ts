/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { AlertsClient } from '../../lib/create_alerts_client.ts/create_alerts_client';
import { getGroupByTermsAgg } from './get_group_by_terms_agg';
import { IdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';
import { EntityType } from '../../../common/entities';

interface Bucket {
  key: Record<string, any>;
  doc_count: number;
}

type EntityTypeBucketsAggregation = Record<EntityType, { buckets: Bucket[] }>;

export async function getLatestEntitiesAlerts({
  alertsClient,
  kuery,
  identityFieldsPerEntityType,
}: {
  alertsClient: AlertsClient;
  kuery?: string;
  identityFieldsPerEntityType: IdentityFieldsPerEntityType;
}): Promise<Array<{ [key: string]: any; alertsCount: number; type: EntityType }>> {
  if (identityFieldsPerEntityType.size === 0) {
    return [];
  }

  const filter = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE), ...kqlQuery(kuery)],
      },
    },
  };

  const response = await alertsClient.search({
    ...filter,
    aggs: getGroupByTermsAgg(identityFieldsPerEntityType),
  });

  const aggregations = response.aggregations as EntityTypeBucketsAggregation;

  const alerts = Array.from(identityFieldsPerEntityType).flatMap(([entityType]) => {
    const entityAggregation = aggregations?.[entityType];

    const buckets = entityAggregation.buckets ?? [];

    return buckets.map((bucket: Bucket) => ({
      alertsCount: bucket.doc_count,
      type: entityType,
      ...bucket.key,
    }));
  });

  return alerts;
}
