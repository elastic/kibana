/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_INTERNAL_INDICES_PATTERN } from '../../../common/constants_entities';
import { SO_API_SCRAPER_API_KEY_TYPE, SO_API_SCRAPER_DEFINITION_TYPE } from '../../saved_objects';

export const canManageApiScraperDefinition = async (
  client: ElasticsearchClient,
  definitionId: string
) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiScraperDefinitionRuntimePrivileges(definitionId),
  });

  return hasAllRequested;
};

const canDeleteApiScraperDefinition = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiScraperDefinitionDeletionPrivileges,
  });

  return hasAllRequested;
};

const canManageAPIKey = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiKeyCreationPrivileges,
  });

  return hasAllRequested;
};

const canDeleteAPIKey = async (client: ElasticsearchClient) => {
  const { has_all_requested: hasAllRequested } = await client.security.hasPrivileges({
    body: apiKeyDeletionPrivileges,
  });

  return hasAllRequested;
};

export const canEnableApiScraper = async (client: ElasticsearchClient, definitionId: string) => {
  return Promise.all([
    canManageAPIKey(client),
    canManageApiScraperDefinition(client, definitionId),
  ]).then((results) => results.every(Boolean));
};

export const canDisableApiScraper = async (client: ElasticsearchClient) => {
  return Promise.all([canDeleteAPIKey(client), canDeleteApiScraperDefinition(client)]).then(
    (results) => results.every(Boolean)
  );
};

export const apiScraperDefinitionRuntimePrivileges = (definitionId: string) => ({
  cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
  index: [
    {
      names: [`.${definitionId}`],
      privileges: ['create_index', 'index', 'create_doc', 'auto_configure', 'read'],
    },
    {
      names: [`.${definitionId}`],
      privileges: ['read', 'view_index_metadata'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [
        `saved_object:${SO_API_SCRAPER_DEFINITION_TYPE}/*`,
        'feature_stackAlerts.all',
        'feature_rulesSettings.all',
        'feature_logs.all',
        'feature_infrastructure.all',
        'feature_apm.all',
        'feature_uptime.all',
        'feature_observabilityCases.all',
        'feature_slo.all',
        'feature_observabilityAIAssistant.all',
      ],
      resources: ['*'],
    },
  ],
});

export const apiScraperDefinitionDeletionPrivileges = {
  cluster: ['manage_transform', 'manage_ingest_pipelines', 'manage_index_templates'],
  index: [
    {
      names: [ENTITY_INTERNAL_INDICES_PATTERN],
      privileges: ['delete_index'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_API_SCRAPER_DEFINITION_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};

export const apiKeyCreationPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_API_SCRAPER_API_KEY_TYPE}/*`],
      resources: ['*'],
    },
  ],
};

const apiKeyDeletionPrivileges = {
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${SO_API_SCRAPER_API_KEY_TYPE}/delete`],
      resources: ['*'],
    },
  ],
};
