/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryResponse,
  AttackDiscoveryStatus,
  AttackDiscoveryUpdateProps,
  Provider,
  UUID,
} from '@kbn/elastic-assistant-common';
import * as uuid from 'uuid';
import { EsReplacementSchema } from '../conversations/types';
import { getAttackDiscovery } from './get_attack_discovery';

export interface UpdateAttackDiscoverySchema {
  id: UUID;
  '@timestamp'?: string;
  attack_discoveries?: Array<{
    alert_ids: string[];
    title: string;
    timestamp: string;
    details_markdown: string;
    entity_summary_markdown: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
    id?: string;
  }>;
  api_config?: {
    action_type_id?: string;
    connector_id?: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  alerts_context_count?: number;
  average_interval_ms?: number;
  generation_intervals?: Array<{ date: string; duration_ms: number }>;
  replacements?: EsReplacementSchema[];
  status?: AttackDiscoveryStatus;
  updated_at?: string;
  last_viewed_at?: string;
  failure_reason?: string;
}

export interface UpdateAttackDiscoveryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  user: AuthenticatedUser;
  attackDiscoveryIndex: string;
  attackDiscoveryUpdateProps: AttackDiscoveryUpdateProps;
}

export const updateAttackDiscovery = async ({
  esClient,
  logger,
  attackDiscoveryIndex,
  attackDiscoveryUpdateProps,
  user,
}: UpdateAttackDiscoveryParams): Promise<AttackDiscoveryResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(updatedAt, attackDiscoveryUpdateProps);
  try {
    await esClient.update({
      refresh: 'wait_for',
      index: attackDiscoveryIndex,
      id: params.id,
      doc: params,
    });

    const updatedAttackDiscovery = await getAttackDiscovery({
      esClient,
      attackDiscoveryIndex,
      id: params.id,
      logger,
      user,
    });

    return updatedAttackDiscovery;
  } catch (err) {
    logger.warn(`Error updating attackDiscovery: ${err} by ID: ${params.id}`);
    throw err;
  }
};

export const transformToUpdateScheme = (
  updatedAt: string,
  {
    alertsContextCount,
    apiConfig,
    attackDiscoveries,
    failureReason,
    generationIntervals,
    id,
    replacements,
    lastViewedAt,
    status,
  }: AttackDiscoveryUpdateProps
): UpdateAttackDiscoverySchema => {
  const averageIntervalMsObj =
    generationIntervals && generationIntervals.length > 0
      ? {
          average_interval_ms: Math.trunc(
            generationIntervals.reduce((acc, interval) => acc + interval.durationMs, 0) /
              generationIntervals.length
          ),
          generation_intervals: generationIntervals.map((interval) => ({
            date: interval.date,
            duration_ms: interval.durationMs,
          })),
        }
      : {};
  return {
    alerts_context_count: alertsContextCount,
    ...(apiConfig
      ? {
          api_config: {
            action_type_id: apiConfig.actionTypeId,
            connector_id: apiConfig.connectorId,
            default_system_prompt_id: apiConfig.defaultSystemPromptId,
            model: apiConfig.model,
            provider: apiConfig.provider,
          },
        }
      : {}),
    ...(attackDiscoveries
      ? {
          attack_discoveries: attackDiscoveries.map((attackDiscovery) => ({
            id: attackDiscovery.id ?? uuid.v4(),
            alert_ids: attackDiscovery.alertIds,
            title: attackDiscovery.title,
            details_markdown: attackDiscovery.detailsMarkdown,
            entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
            mitre_attack_tactics: attackDiscovery.mitreAttackTactics,
            summary_markdown: attackDiscovery.summaryMarkdown,
            timestamp: updatedAt,
          })),
        }
      : {}),
    failure_reason: failureReason,
    id,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    ...(status ? { status } : {}),
    // only update updated_at time if this is not an update to last_viewed_at
    ...(lastViewedAt ? { last_viewed_at: lastViewedAt } : { updated_at: updatedAt }),
    ...averageIntervalMsObj,
  };
};
