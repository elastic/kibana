/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../common';
import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';

import { appContextService } from '..';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../constants';
import { getSettings, saveSettings } from '../settings';
import { FleetError } from '../../errors';

const PENDING_TIMEOUT = 60 * 60 * 1000;

export async function enableSpaceAwarenessMigration() {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const logger = appContextService.getLogger();
  try {
    const existingSettings = await getSettings(soClient);
    if (existingSettings.use_space_awareness_migration_status === 'success') {
      throw new FleetError('Migration is already done.');
    }

    if (
      existingSettings.use_space_awareness_migration_started_at &&
      new Date(existingSettings.use_space_awareness_migration_started_at).getTime() >
        Date.now() - PENDING_TIMEOUT
    ) {
      throw new FleetError('Migration is pending.');
    }

    logger.info('Starting Fleet space awareness migration');

    await saveSettings(
      soClient,
      {
        use_space_awareness_migration_status: 'pending',
        use_space_awareness_migration_started_at: new Date().toISOString(),
      },
      {
        version: existingSettings.version,
      }
    );

    // Migration
    // Agent Policy
    await batchMigration(
      soClient,
      LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
      AGENT_POLICY_SAVED_OBJECT_TYPE
    );
    await batchMigration(
      soClient,
      LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      PACKAGE_POLICY_SAVED_OBJECT_TYPE
    );

    // Update Settings SO
    await saveSettings(soClient, {
      use_space_awareness_migration_status: 'success',
      use_space_awareness_migration_started_at: null,
    });

    logger.info('Fleet space awareness migration is complete');
  } catch (error) {
    logger.error('Fleet space awareness migration failed', { error });
    await saveSettings(soClient, {
      use_space_awareness_migration_status: 'error',
      use_space_awareness_migration_started_at: null,
    });
    throw error;
  }
}

const BATCH_SIZE = 1000;

async function batchMigration(
  soClient: SavedObjectsClientContract,
  sourceSoType: string,
  targetSoType: string
) {
  const finder = soClient.createPointInTimeFinder({
    type: sourceSoType,
    perPage: BATCH_SIZE,
  });
  try {
    for await (const result of finder.find()) {
      const createRes = await soClient.bulkCreate<any>(
        result.saved_objects.map((so) => ({
          type: targetSoType,
          id: so.id,
          attributes: so.attributes,
        })),
        {
          overwrite: true,
        }
      );
      for (const res of createRes.saved_objects) {
        if (res.error) {
          throw res.error;
        }
      }
    }
  } finally {
    await finder.close();
  }
}
