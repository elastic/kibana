/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { EsAttackDiscoverySchema } from './types';

export const transformESSearchToAttackDiscovery = (
  response: estypes.SearchResponse<EsAttackDiscoverySchema>
): AttackDiscoveryResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const adSchema = hit._source!;
      const ad: AttackDiscoveryResponse = {
        timestamp: adSchema['@timestamp'],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
        backingIndex: hit._index,
        createdAt: adSchema.created_at,
        updatedAt: adSchema.updated_at,
        lastViewedAt: adSchema.last_viewed_at,
        users:
          adSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        namespace: adSchema.namespace,
        status: adSchema.status,
        alertsContextCount: adSchema.alerts_context_count,
        apiConfig: {
          connectorId: adSchema.api_config.connector_id,
          actionTypeId: adSchema.api_config.action_type_id,
          defaultSystemPromptId: adSchema.api_config.default_system_prompt_id,
          model: adSchema.api_config.model,
          provider: adSchema.api_config.provider,
        },
        attackDiscoveries: adSchema.attack_discoveries.map((attackDiscovery) => ({
          alertIds: attackDiscovery.alert_ids,
          title: attackDiscovery.title,
          detailsMarkdown: attackDiscovery.details_markdown,
          entitySummaryMarkdown: attackDiscovery.entity_summary_markdown,
          mitreAttackTactics: attackDiscovery.mitre_attack_tactics,
          summaryMarkdown: attackDiscovery.summary_markdown,
          timestamp: attackDiscovery.timestamp,
        })),
        replacements: adSchema.replacements?.reduce((acc: Record<string, string>, r) => {
          acc[r.uuid] = r.value;
          return acc;
        }, {}),
        generationIntervals:
          adSchema.generation_intervals?.map((interval) => ({
            date: interval.date,
            durationMs: interval.duration_ms,
          })) ?? [],
        averageIntervalMs: adSchema.average_interval_ms ?? 0,
        failureReason: adSchema.failure_reason,
      };

      return ad;
    });
};
