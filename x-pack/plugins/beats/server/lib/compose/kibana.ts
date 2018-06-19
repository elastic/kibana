/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraKibanaBackendFrameworkAdapter } from '../adapters/famework/kibana/kibana_framework_adapter';
import { CMDomainLibs, CMServerLibs } from '../lib';

import { Server } from 'hapi';

export function compose(server: Server): CMServerLibs {
  const framework = new InfraKibanaBackendFrameworkAdapter(server);

  const domainLibs: CMDomainLibs = {};

  const libs: CMServerLibs = {
    framework,
    ...domainLibs,
  };

  return libs;
}
