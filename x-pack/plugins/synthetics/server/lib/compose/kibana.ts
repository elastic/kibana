/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMKibanaBackendFrameworkAdapter } from '../adapters/framework';
import { requests } from '../requests';
import { licenseCheck } from '../domains';
import { UMServerLibs } from '../lib';
import { UptimeServerSetup } from '../adapters/framework';

export function compose(server: UptimeServerSetup): UMServerLibs {
  const framework = new UMKibanaBackendFrameworkAdapter(server);

  return {
    framework,
    requests,
    license: licenseCheck,
  };
}
