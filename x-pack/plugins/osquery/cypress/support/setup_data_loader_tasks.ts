/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import path from 'path';
import type { LoadedRoleAndUser } from '@kbn/securitysolution-runtime-services';
import {
  createRuntimeServices,
  SecurityRoleAndUserLoader,
} from '@kbn/securitysolution-runtime-services';

const ROLES_YAML_FILE_PATH = path.join(__dirname, 'project_controller_osquery_roles.yml');
const roleDefinitions = loadYaml(readFileSync(ROLES_YAML_FILE_PATH, 'utf8'));

export const setupUserDataLoader = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
  });

  const roleAndUserLoaderPromise: Promise<SecurityRoleAndUserLoader> = stackServicesPromise.then(
    ({ kbnClient, log }) => new SecurityRoleAndUserLoader(kbnClient, log, roleDefinitions)
  );

  on('task', {
    /**
     * Loads a user/role into Kibana. Used from `login()` task.
     * @param name
     */
    loadUserAndRole: async ({ name }): Promise<LoadedRoleAndUser> =>
      (await roleAndUserLoaderPromise).load(name),
  });
};
