/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { KibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchPingsAdapter } from '../adapters/pings/elasticsearch_pings_adapter';
import { HBPingsDomain } from '../domains';
import { HBDomainLibs, HBServerLibs } from '../lib';

export function compose(hapiServer: Server): HBServerLibs {
  const framework = new KibanaBackendFrameworkAdapter(hapiServer);
  const database = new KibanaDatabaseAdapter(hapiServer.plugins.elasticsearch);

  const pingsDomain = new HBPingsDomain(new ElasticsearchPingsAdapter(database), {});

  const domainLibs: HBDomainLibs = {
    pings: pingsDomain,
  };

  const libs: HBServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}
