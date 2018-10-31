/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { KibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchMonitorsAdapter } from '../adapters/monitors/elasticsearch_monitors_adapter';
import { HBMonitorsDomain } from '../domains';
import { HBDomainLibs, HBServerLibs } from '../lib';

export function compose(hapiServer: any): HBServerLibs {
  const framework = new KibanaBackendFrameworkAdapter(hapiServer);
  const database = new KibanaDatabaseAdapter(hapiServer.plugins.elasticsearch);

  const monitorsDomain = new HBMonitorsDomain(new ElasticsearchMonitorsAdapter(database), {});

  const domainLibs: HBDomainLibs = {
    monitors: monitorsDomain,
  };

  const libs: HBServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}
