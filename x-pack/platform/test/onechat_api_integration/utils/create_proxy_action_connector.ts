/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export async function createProxyActionConnector(
  getService: FtrProviderContext['getService'],
  { port }: { port: number }
) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const logger = getService('log');

  logger.info('Creating Proxy Action Connector');

  const internalReqHeader = samlAuth.getInternalRequestHeader();
  logger.info(`internalReqHeader ${JSON.stringify(internalReqHeader)}`);
  const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

  logger.info(`role ${roleAuthc.apiKey}`);

  try {
    const res = await supertestWithoutAuth
      .post('/api/actions/connector')
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader)
      .send({
        name: 'OpenAI Proxy',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${port}`,
        },
        secrets: {
          apiKey: 'my-api-key',
        },
      })
      .expect(200);

    const connectorId = res.body.id as string;
    return connectorId;
  } catch (e) {
    logger.error(`Failed to create action connector due to: ${e}`);
    throw e;
  }
}
