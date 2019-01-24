/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMemoryAuthAdapter } from '../adapters/auth';
import { UMTestBackendFrameworkAdapter } from '../adapters/framework/test_backend_framework_adapter';
import { UMMemoryMonitorsAdapter } from '../adapters/monitors';
import { MemoryPingsAdapter } from '../adapters/pings/memory_pings_adapter';
import { UMAuthDomain, UMMonitorsDomain, UMPingsDomain } from '../domains';
import { UMServerLibs } from '../lib';

export function compose(server: any): UMServerLibs {
  const framework = new UMTestBackendFrameworkAdapter(server);

  const pingsDomain = new UMPingsDomain(new MemoryPingsAdapter(server.pingsDB || []), framework);
  const authDomain = new UMAuthDomain(new UMMemoryAuthAdapter(server.xpack), framework);
  const monitorsDomain = new UMMonitorsDomain(
    new UMMemoryMonitorsAdapter(server.pingsDB || []),
    framework
  );

  const libs: UMServerLibs = {
    auth: authDomain,
    framework,
    pings: pingsDomain,
    monitors: monitorsDomain,
  };

  return libs;
}
