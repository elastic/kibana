/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { EntityDataStreamType } from '@kbn/observability-shared-plugin/common';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { castArray } from 'lodash';
import { Logger } from '@kbn/logging';
import { type InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getHasMetricsData } from './get_has_metrics_data';
import { getLatestEntity } from './get_latest_entity';

interface Params {
  entityId: string;
  entityType: 'host' | 'container';
  entityCentriExperienceEnabled: boolean;
  infraMetricsClient: InfraMetricsClient;
  obsEsClient: ObservabilityElasticsearchClient;
  entityManagerClient: EntityClient;
  logger: Logger;
}

export async function getDataStreamTypes({
  entityCentriExperienceEnabled,
  entityId,
  entityManagerClient,
  entityType,
  infraMetricsClient,
  obsEsClient,
  logger,
}: Params) {
  const hasMetricsData = await getHasMetricsData({
    infraMetricsClient,
    entityId,
    field: findInventoryFields(entityType).id,
  });

  const sourceDataStreams = new Set(hasMetricsData ? [EntityDataStreamType.METRICS] : []);

  if (!entityCentriExperienceEnabled) {
    return Array.from(sourceDataStreams);
  }

  const latestEntity = await getLatestEntity({
    inventoryEsClient: obsEsClient,
    entityId,
    entityType,
    entityManagerClient,
    logger,
  });

  if (latestEntity) {
    castArray(latestEntity.sourceDataStreamType).forEach((item) => {
      sourceDataStreams.add(item as EntityDataStreamType);
    });
  }

  return Array.from(sourceDataStreams);
}
