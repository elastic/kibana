/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';
import { EntityDataStreamType, EntityType } from '@kbn/observability-shared-plugin/common';
import { useFetcher } from '../../../hooks/use_fetcher';

const EntityTypeSchema = z.union([z.literal(EntityType.HOST), z.literal(EntityType.CONTAINER)]);
const EntityDataStreamSchema = z.union([
  z.literal(EntityDataStreamType.METRICS),
  z.literal(EntityDataStreamType.LOGS),
]);

const EntitySummarySchema = z.object({
  entityType: EntityTypeSchema,
  entityId: z.string(),
  sourceDataStreams: z.array(EntityDataStreamSchema),
});

export type EntitySummary = z.infer<typeof EntitySummarySchema>;

export function useEntitySummary({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const { data, status } = useFetcher(
    async (callApi) => {
      if (!entityType || !entityId) {
        return undefined;
      }

      const response = await callApi(`/api/infra/entities/${entityType}/${entityId}/summary`, {
        method: 'GET',
      });

      return EntitySummarySchema.parse(response);
    },
    [entityType, entityId]
  );

  return { dataStreams: data?.sourceDataStreams ?? [], status };
}
