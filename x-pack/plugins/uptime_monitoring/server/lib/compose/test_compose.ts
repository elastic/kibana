/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMTestBackendFrameworkAdapter } from '../adapters/framework/test_backend_framework_adapter';
import { MemoryPingsAdapter } from '../adapters/pings/memory_pings_adapter';
import { UMPingsDomain } from '../domains';
import { UMServerLibs } from '../lib';

export function compose(server: any): UMServerLibs {
  const framework = new UMTestBackendFrameworkAdapter(server);

  const pingsDomain = new UMPingsDomain(new MemoryPingsAdapter(server.pingsDB || []), framework);

  const libs: UMServerLibs = {
    framework,
    pings: pingsDomain,
  };

  return libs;
}
