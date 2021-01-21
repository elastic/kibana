/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import {
  ENROLLMENT_API_KEYS_INDEX,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  FleetServerEnrollmentAPIKey,
} from '../../common';
import { listEnrollmentApiKeys, getEnrollmentAPIKey } from './api_keys/enrollment_api_key_so';
import { appContextService } from './app_context';

export async function runFleetServerMigration() {
  const logger = appContextService.getLogger();
  logger.info('Starting fleet server migration');
  await migrateEnrollmentApiKeys();
  logger.info('Fleet server migration finished');
}

function getInternalUserSOClient() {
  const fakeRequest = ({
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
  } as unknown) as KibanaRequest;

  return appContextService.getInternalUserSOClient(fakeRequest);
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
    }
  }
}
