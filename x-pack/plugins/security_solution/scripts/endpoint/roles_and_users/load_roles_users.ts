/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { SecurityRoleAndUserLoader } from '../../../../../test_serverless/shared/lib';

const VALID_TYPES = ['serverless'] as const;

export type RolesAndUsersType = typeof VALID_TYPES[number];

export const loadRolesAndUsers = async (
  kbnClient: KbnClient,
  logger: ToolingLog,
  type: RolesAndUsersType
) => {
  if (type === 'serverless') {
    const silentLogger = new ToolingLog({
      writeTo: process.stdout,
      level: 'silent',
    });

    const roleAndUserLoader = new SecurityRoleAndUserLoader(kbnClient, silentLogger);

    const loadedRoles = await roleAndUserLoader.loadAll();

    logger.info(`DONE.
The following roles were loaded:
${JSON.stringify(loadedRoles, null, 2)}
    `);
  } else {
    throw new Error(`Unknown type [${type}]. Valid values are: ${VALID_TYPES.join(', ')}`);
  }
};
