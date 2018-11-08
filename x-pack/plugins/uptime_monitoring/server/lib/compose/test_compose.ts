/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestBackendFrameworkAdapter } from '../adapters/framework/test_backend_framework_adapter';
import { MemoryPingsAdapter } from '../adapters/pings/memory_pings_adapter';
import { HBPingsDomain } from '../domains';
import { HBServerLibs } from '../lib';

export function compose(server: any): HBServerLibs {
  const framework = new TestBackendFrameworkAdapter(server);

  const pingsDomain = new HBPingsDomain(new MemoryPingsAdapter(server.pingsDB || []), framework);

  const libs: HBServerLibs = {
    framework,
    pings: pingsDomain,
  };

  return libs;
}
