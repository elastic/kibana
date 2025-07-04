/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { kbnTestConfig } from '@kbn/test';
import {
  createLogger,
  LogLevel,
  SynthtraceClientsManager,
  SynthtraceClientTypes,
  GetClientsReturn,
} from '@kbn/apm-synthtrace';
import { FtrProviderContext } from '../ftr_provider_context';

const getKibanaServerUrlWithAuth = () => {
  const kibanaServerUrl = url.format(kbnTestConfig.getUrlParts() as url.UrlObject);
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
      auth: `elastic:${kbnTestConfig.getUrlParts().password}`,
    })
    .slice(0, -1);
  return kibanaServerUrlWithAuth;
};

export function SynthtraceClientProvider({ getService }: FtrProviderContext) {
  const esClient = getService('es');

  const kibanaServerUrlWithAuth = getKibanaServerUrlWithAuth();
  const target = kibanaServerUrlWithAuth;
  const logger = createLogger(LogLevel.debug);
  const username = 'elastic';
  const password = kbnTestConfig.getUrlParts().password || 'changeme';

  return {
    getClients<TClient extends SynthtraceClientTypes>(
      synthtraceClients: TClient[]
    ): GetClientsReturn<TClient> {
      const clientManager = new SynthtraceClientsManager({
        client: esClient,
        logger,
        refreshAfterIndex: true,
        includePipelineSerialization: false,
      });

      const clients = clientManager.getClients({
        clients: synthtraceClients,
        kibana: {
          target,
          username,
          password,
        },
      });

      return clients;
    },
  };
}
