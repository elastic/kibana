/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixedOutputLogger } from '../../../../scripts/endpoint/common/utils';
import type { RuntimeServices } from '../../../../scripts/endpoint/common/stack_services';
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';

const RUNTIME_SERVICES_CACHE = new WeakMap<Cypress.PluginConfigOptions, RuntimeServices>();

export const setupStackServicesUsingCypressConfig = async (config: Cypress.PluginConfigOptions) => {
  if (RUNTIME_SERVICES_CACHE.has(config)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return RUNTIME_SERVICES_CACHE.get(config)!;
  }

  const stackServices = await createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: true,
  }).then(({ log, ...others }) => {
    return {
      ...others,
      log: prefixedOutputLogger('cy.dfw', log),
    };
  });

  RUNTIME_SERVICES_CACHE.set(config, stackServices);

  return stackServices;
};
