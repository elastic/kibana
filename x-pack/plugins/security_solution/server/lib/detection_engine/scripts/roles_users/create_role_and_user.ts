/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import yargs from 'yargs';
import { ToolingLog } from '@kbn/tooling-log';
import {
  KNOWN_ESS_ROLE_DEFINITIONS,
  KNOWN_SERVERLESS_ROLE_DEFINITIONS,
} from '../../../../../common/test';

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});
const KNOWN_ROLE_DEFINITIONS = {
  ...KNOWN_ESS_ROLE_DEFINITIONS,
  ...KNOWN_SERVERLESS_ROLE_DEFINITIONS,
};
const DEFAULT_PASSWORD = 'changeme';

cli()
  .then(() => logger.success('Done'))
  .catch((e) => logger.error(e));

async function cli(): Promise<void> {
  const { role } = yargs(process.argv)
    .choices(
      'role',
      Object.keys(KNOWN_ROLE_DEFINITIONS) as Array<keyof typeof KNOWN_ROLE_DEFINITIONS>
    )
    .demandOption('role')
    .version(false)
    .help(false).argv;
  const selectedRoleDefinition = KNOWN_ROLE_DEFINITIONS[role];
  const userName = role;
  const ELASTICSEARCH_URL = getEnvVariableOrDefault('ELASTICSEARCH_URL', 'http://127.0.0.1:9200');
  const KIBANA_URL = getEnvVariableOrDefault('KIBANA_URL', 'http://127.0.0.1:560');
  const USERNAME = getEnvVariableOrDefault('USERNAME', 'elastic');
  const PASSWORD = getEnvVariableOrDefault('PASSWORD', DEFAULT_PASSWORD);
  const password = DEFAULT_PASSWORD;
  const requestHeaders = {
    Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
    'kbn-xsrf': 'xxx',
  };

  try {
    logger.info(`Creating role "${role}"...`);
    await axios.put(
      `${KIBANA_URL}/api/security/role/${role}`,
      {
        elasticsearch: selectedRoleDefinition.elasticsearch,
        kibana: selectedRoleDefinition.kibana,
      },
      {
        headers: requestHeaders,
      }
    );

    logger.info(`Role "${role}" has been created`);
  } catch (e) {
    logger.error(`Unable to create role "${role}"`);
    throw e;
  }

  try {
    logger.info(`Creating user "${userName}"...`);
    await axios.put(
      `${ELASTICSEARCH_URL}/_security/user/${userName}`,
      {
        password,
        roles: [role],
        full_name: role,
        email: `role@example.com`,
      },
      {
        headers: requestHeaders,
      }
    );

    logger.info(`User "${userName}" has been created (password "${password}")`);
  } catch (e) {
    logger.error(`Unable to create user "${userName}"`);
    throw e;
  }
}

function getEnvVariableOrDefault(variableName: string, defaultValue: string): string {
  const value = process.env[variableName];

  if (!value) {
    logger.warning(
      `Environment variable "${variableName}" is not set, using "${defaultValue}" as a default value`
    );

    return defaultValue;
  }

  logger.info(`Using environment variable ${variableName}=${value}`);

  return value;
}
