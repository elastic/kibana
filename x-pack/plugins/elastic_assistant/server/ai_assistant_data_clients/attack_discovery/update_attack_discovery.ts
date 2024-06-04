/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryResponse,
  AttackDiscoveryUpdateProps,
  Provider,
  UUID,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { EsReplacementSchema } from '../conversations/types';
import { getAttackDiscovery } from './get_attack_discovery';

export interface UpdateAttackDiscoverySchema {
  id: UUID;
  '@timestamp'?: string;
  attack_discoveries: Array<{
    alert_ids: string[];
    title: string;
    timestamp: string;
    details_markdown: string;
    entity_summary_markdown: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
  }>;
  api_config?: {
    action_type_id?: string;
    connector_id?: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  replacements?: EsReplacementSchema[];
  updated_at?: string;
}

export interface UpdateAttackDiscoveryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  user: AuthenticatedUser;
  attackDiscoveryIndex: string;
  attackDiscoveryUpdateProps: AttackDiscoveryUpdateProps;
  isPatch?: boolean;
}

export const updateAttackDiscovery = async ({
  esClient,
  logger,
  attackDiscoveryIndex,
  attackDiscoveryUpdateProps,
  isPatch,
  user,
}: UpdateAttackDiscoveryParams): Promise<AttackDiscoveryResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(updatedAt, attackDiscoveryUpdateProps);
  try {
    const response = await esClient.updateByQuery({
      conflicts: 'proceed',
      index: attackDiscoveryIndex,
      query: {
        ids: {
          values: [params.id],
        },
      },
      refresh: true,
      // script: getUpdateScript({ attackDiscovery: params, isPatch }),
    });

    if (response.failures && response.failures.length > 0) {
      logger.warn(
        `Error updating attack discovery: ${response.failures.map((f) => f.id)} by ID: ${params.id}`
      );
      return null;
    }

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
  { apiConfig, attackDiscoveries, replacements, id }: AttackDiscoveryUpdateProps
): UpdateAttackDiscoverySchema => {
  return {
    id,
    updated_at: updatedAt,
    api_config: {
      action_type_id: apiConfig?.actionTypeId,
      connector_id: apiConfig?.connectorId,
      default_system_prompt_id: apiConfig?.defaultSystemPromptId,
      model: apiConfig?.model,
      provider: apiConfig?.provider,
    },
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    attack_discoveries:
      attackDiscoveries?.map((attackDiscovery) => ({
        alert_ids: attackDiscovery.alertIds,
        title: attackDiscovery.title,
        details_markdown: attackDiscovery.detailsMarkdown,
        entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
        mitre_attack_tactics: attackDiscovery.mitreAttackTactics,
        summary_markdown: attackDiscovery.summaryMarkdown,
        timestamp: attackDiscovery.timestamp,
      })) ?? [],
  };
};
