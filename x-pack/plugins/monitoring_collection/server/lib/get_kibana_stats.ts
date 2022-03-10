/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';

const SNAPSHOT_REGEX = /-snapshot/i;

const ServiceStatusToLegacyState: Record<string, string> = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};

export function getKibanaStats({
  config,
  getStatus,
}: {
  config: {
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  getStatus: () => ServiceStatus<unknown>;
}) {
  const status = getStatus();
  return {
    uuid: config.uuid,
    name: config.server.name,
    index: config.kibanaIndex,
    host: config.server.hostname,
    locale: i18n.getLocale(),
    transport_address: `${config.server.hostname}:${config.server.port}`,
    version: config.kibanaVersion.replace(SNAPSHOT_REGEX, ''),
    snapshot: SNAPSHOT_REGEX.test(config.kibanaVersion),
    status: ServiceStatusToLegacyState[status.level.toString()],
  };
}
