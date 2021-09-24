/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { KibanaRequest } from 'src/core/server';

import {
  ENROLLMENT_API_KEYS_INDEX,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  AGENT_POLICY_INDEX,
  AGENTS_INDEX,
  AGENT_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../common';
import type {
  FleetServerEnrollmentAPIKey,
  AgentSOAttributes,
  FleetServerAgent,
} from '../../../common';
import { listEnrollmentApiKeys, getEnrollmentAPIKey } from '../api_keys/enrollment_api_key_so';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { invalidateAPIKeys } from '../api_keys';
import { settingsService } from '..';

export async function runFleetServerMigration() {
  await settingsService.settingsSetup(getInternalUserSOClient());
  await Promise.all([migrateEnrollmentApiKeys(), migrateAgentPolicies(), migrateAgents()]);
}

function getInternalUserSOClient() {
  const fakeRequest = {
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown as KibanaRequest;

  return appContextService.getInternalUserSOClient(fakeRequest);
}

async function migrateAgents() {
  const esClient = appContextService.getInternalUserESClient();
  const soClient = getInternalUserSOClient();
  const logger = appContextService.getLogger();
  let hasMore = true;

  let hasAgents = false;

  while (hasMore) {
    const res = await soClient.find({
      type: AGENT_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 100,
    });

    if (res.total === 0) {
      hasMore = false;
    } else {
      hasAgents = true;
    }

    for (const so of res.saved_objects) {
      try {
        const { attributes } = await appContextService
          .getEncryptedSavedObjects()
          .getDecryptedAsInternalUser<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, so.id);

        await invalidateAPIKeys(
          [attributes.access_api_key_id, attributes.default_api_key_id].filter(
            (keyId): keyId is string => keyId !== undefined
          )
        ).catch((error) => {
          logger.error(`Invalidating API keys for agent ${so.id} failed: ${error.message}`);
        });

        const body: FleetServerAgent = {
          type: attributes.type,
          active: false,
          enrolled_at: attributes.enrolled_at,
          unenrolled_at: new Date().toISOString(),
          unenrollment_started_at: attributes.unenrollment_started_at,
          upgraded_at: attributes.upgraded_at,
          upgrade_started_at: attributes.upgrade_started_at,
          access_api_key_id: attributes.access_api_key_id,
          user_provided_metadata: attributes.user_provided_metadata,
          local_metadata: attributes.local_metadata,
          policy_id: attributes.policy_id,
          policy_revision_idx: attributes.policy_revision || undefined,
          last_checkin: attributes.last_checkin,
          last_checkin_status: attributes.last_checkin_status,
          default_api_key_id: attributes.default_api_key_id,
          default_api_key: attributes.default_api_key,
          packages: attributes.packages,
        };
        await esClient.create({
          index: AGENTS_INDEX,
          body,
          id: so.id,
          refresh: 'wait_for',
        });

        await soClient.delete(AGENT_SAVED_OBJECT_TYPE, so.id);
      } catch (error) {
        // swallow 404 error has multiple Kibana can run the migration at the same time
        if (!is404Error(error)) {
          throw error;
        }
      }
    }
  }

  // Update settings to show migration modal
  if (hasAgents) {
    await settingsService.saveSettings(soClient, {
      has_seen_fleet_migration_notice: false,
    });
  }
}

async function migrateEnrollmentApiKeys() {
  const esClient = appContextService.getInternalUserESClient();
  const soClient = getInternalUserSOClient();
  let hasMore = true;
  while (hasMore) {
    const res = await listEnrollmentApiKeys(soClient, {
      page: 1,
      perPage: 100,
    });
    if (res.total === 0) {
      hasMore = false;
    }
    for (const item of res.items) {
      try {
        const key = await getEnrollmentAPIKey(soClient, item.id);

        const body: FleetServerEnrollmentAPIKey = {
          api_key: key.api_key,
          api_key_id: key.api_key_id,
          active: key.active,
          created_at: key.created_at,
          name: key.name,
          policy_id: key.policy_id,
        };
        await esClient.create({
          index: ENROLLMENT_API_KEYS_INDEX,
          body,
          id: key.id,
          refresh: 'wait_for',
        });

        await soClient.delete(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, key.id);
      } catch (error) {
        // swallow 404 error has multiple Kibana can run the migration at the same time
        if (!is404Error(error)) {
          throw error;
        }
      }
    }
  }
}

async function migrateAgentPolicies() {
  const esClient = appContextService.getInternalUserESClient();
  const soClient = getInternalUserSOClient();
  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map(async (agentPolicy) => {
      const res = await esClient.search({
        index: AGENT_POLICY_INDEX,
        q: `policy_id:${agentPolicy.id}`,
        track_total_hits: true,
        ignore_unavailable: true,
      });

      // @ts-expect-error value is number | TotalHits
      if (res.body.hits.total.value === 0) {
        return agentPolicyService.createFleetServerPolicy(soClient, agentPolicy.id);
      }
    })
  );
}

function is404Error(error: any) {
  return isBoom(error) && error.output.statusCode === 404;
}
