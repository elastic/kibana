/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogger, LogLevel, SynthtraceClientsManager } from '@kbn/synthtrace';
import type { FtrProviderContext } from '../../ftr_provider_context';

export function LogsSynthtraceProvider(context: FtrProviderContext) {
  const clientManager = new SynthtraceClientsManager({
    client: context.getService('es'),
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });

  const { logsEsClient } = clientManager.getClients({
    clients: ['logsEsClient'],
  });

  return logsEsClient;
}
