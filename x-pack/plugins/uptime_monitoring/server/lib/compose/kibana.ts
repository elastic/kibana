/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMXPackAuthAdapter } from '../adapters/auth';
import { UMKibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { ElasticsearchPingsAdapter } from '../adapters/pings/elasticsearch_pings_adapter';
import { UMPingsDomain } from '../domains';
import { UMAuthDomain } from '../domains/auth';
import { UMDomainLibs, UMServerLibs } from '../lib';

export function compose(hapiServer: any): UMServerLibs {
  const framework = new UMKibanaBackendFrameworkAdapter(hapiServer);
  const database = new UMKibanaDatabaseAdapter(hapiServer.plugins.elasticsearch);

  const pingsDomain = new UMPingsDomain(new ElasticsearchPingsAdapter(database), {});
  const authDomain = new UMAuthDomain(new UMXPackAuthAdapter(hapiServer.plugins.xpack_main), {});

  const domainLibs: UMDomainLibs = {
    pings: pingsDomain,
    auth: authDomain,
  };

  const libs: UMServerLibs = {
    framework,
    database,
    ...domainLibs,
  };

  return libs;
}
