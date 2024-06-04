/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { AttackDiscoveryCreateProps, AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { getAttackDiscovery } from './get_attack_discovery';
import { CreateAttackDiscoverySchema } from './types';

export interface CreateAttackDiscoveryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  attackDiscoveryIndex: string;
  spaceId: string;
  user: AuthenticatedUser;
  attackDiscoveries: AttackDiscoveryCreateProps;
}

export const createAttackDiscovery = async ({
  esClient,
  attackDiscoveryIndex,
  spaceId,
  user,
  attackDiscoveries,
  logger,
}: CreateAttackDiscoveryParams): Promise<AttackDiscoveryResponse | null> => {
  const createdAt = new Date().toISOString();
  const body = transformToCreateScheme(createdAt, spaceId, user, attackDiscoveries);
  const id = attackDiscoveries?.id || uuidv4();
  try {
    const response = await esClient.create({
      body,
      id,
      index: attackDiscoveryIndex,
      refresh: 'wait_for',
    });

    const createdAttackDiscovery = await getAttackDiscovery({
      esClient,
      attackDiscoveryIndex,
      id: response._id,
      logger,
      user,
    });
    return createdAttackDiscovery;
  } catch (err) {
    logger.error(`Error creating attack discovery: ${err} with id: ${id}`);
    throw err;
  }
};

export const transformToCreateScheme = (
  createdAt: string,
  spaceId: string,
  user: AuthenticatedUser,
  { attackDiscoveries, apiConfig, replacements }: AttackDiscoveryCreateProps
): CreateAttackDiscoverySchema => {
  return {
    '@timestamp': createdAt,
    created_at: createdAt,
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
    api_config: apiConfig
      ? {
          action_type_id: apiConfig.actionTypeId,
          connector_id: apiConfig.connectorId,
          default_system_prompt_id: apiConfig.defaultSystemPromptId,
          model: apiConfig.model,
          provider: apiConfig.provider,
        }
      : undefined,
    attack_discoveries: attackDiscoveries?.map((attackDiscovery) => ({
      alert_ids: attackDiscovery.alertIds,
      title: attackDiscovery.title,
      details_markdown: attackDiscovery.detailsMarkdown,
      entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
      mitre_attack_tactics: attackDiscovery.mitreAttackTactics,
      summary_markdown: attackDiscovery.summaryMarkdown,
      timestamp: attackDiscovery.timestamp,
    })),
    updated_at: createdAt,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    namespace: spaceId,
  };
};
