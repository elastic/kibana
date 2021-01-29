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
  FLEET_SERVER_PACKAGE,
  FLEET_SERVER_INDICES,
} from '../../common';
import { listEnrollmentApiKeys, getEnrollmentAPIKey } from './api_keys/enrollment_api_key_so';
import { appContextService } from './app_context';
import { getInstallation } from './epm/packages';

export async function isFleetServerSetup() {
  const pkgInstall = await getInstallation({
    savedObjectsClient: getInternalUserSOClient(),
    pkgName: FLEET_SERVER_PACKAGE,
  });

  if (!pkgInstall) {
    return false;
  }

  const esClient = appContextService.getInternalUserESClient();

  const exists = await Promise.all(
    FLEET_SERVER_INDICES.map(async (index) => {
      const res = await esClient.indices.exists({
        index,
      });
      return res.statusCode !== 404;
    })
  );

  return exists.every((exist) => exist === true);
}

export async function runFleetServerMigration() {
  await migrateEnrollmentApiKeys();
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
