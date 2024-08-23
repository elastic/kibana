/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';

import { AttackDiscoveryCreateProps, AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import { getAttackDiscovery } from './get_attack_discovery';
import { CreateAttackDiscoverySchema } from './types';

export interface CreateAttackDiscoveryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  attackDiscoveryIndex: string;
  spaceId: string;
  user: AuthenticatedUser;
  attackDiscoveryCreate: AttackDiscoveryCreateProps;
}

export const createAttackDiscovery = async ({
  esClient,
  attackDiscoveryIndex,
  spaceId,
  user,
  attackDiscoveryCreate,
  logger,
}: CreateAttackDiscoveryParams): Promise<AttackDiscoveryResponse | null> => {
  const createdAt = new Date().toISOString();
  const body = transformToCreateScheme(createdAt, spaceId, user, attackDiscoveryCreate);
  const id = attackDiscoveryCreate?.id || uuidv4();
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
  {
    attackDiscoveries,
    apiConfig,
    alertsContextCount,
    replacements,
    status,
  }: AttackDiscoveryCreateProps
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
    status,
    api_config: {
      action_type_id: apiConfig.actionTypeId,
      connector_id: apiConfig.connectorId,
      default_system_prompt_id: apiConfig.defaultSystemPromptId,
      model: apiConfig.model,
      provider: apiConfig.provider,
    },
    alerts_context_count: alertsContextCount,
    attack_discoveries: attackDiscoveries?.map((attackDiscovery) => ({
      id: attackDiscovery.id,
      alert_ids: attackDiscovery.alertIds,
      title: attackDiscovery.title,
      details_markdown: attackDiscovery.detailsMarkdown,
      entity_summary_markdown: attackDiscovery.entitySummaryMarkdown,
      mitre_attack_tactics: attackDiscovery.mitreAttackTactics,
      summary_markdown: attackDiscovery.summaryMarkdown,
      timestamp: attackDiscovery.timestamp ?? createdAt,
    })),
    updated_at: createdAt,
    last_viewed_at: createdAt,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    namespace: spaceId,
  };
};
