/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  ElasticsearchServiceSetup,
} from 'kibana/server';
import { isApiKeyDisabledError, isSecurityPluginDisabledError } from './lib/error_handler';
import { AlertingFrameworkHealth } from '../types';

export function healthRoute(router: IRouter, elasticsearch: ElasticsearchServiceSetup) {
  const clusterClient = elasticsearch.createClient('alertingSecurity', {
    plugins: [elasticsearchClientPlugin],
  });

  router.get(
    {
      path: '/api/alert/_health',
      validate: false,
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      try {
        const scopedClusterClient = clusterClient.asScoped(req);

        const {
          canGenerateApiKeys,
        }: AlertingFrameworkHealth = await scopedClusterClient
          .callAsCurrentUser('alertingSecurity.canGenerateApiKeys', { owner: true })
          .then(
            //  If the API returns a truthy result that means it's enabled.
            (result: unknown) => ({ canGenerateApiKeys: !!result }),
            // This is a brittle dependency upon message. Tracked by https://github.com/elastic/elasticsearch/issues/47759.
            (e: Error) =>
              isApiKeyDisabledError(e)
                ? Promise.resolve({ canGenerateApiKeys: false })
                : isSecurityPluginDisabledError(e)
                ? // If no handler is available, this means security is disabled, in which
                  // case generating keys should work fine
                  Promise.resolve({ canGenerateApiKeys: true })
                : Promise.reject(e)
          );

        return res.ok({
          body: { canGenerateApiKeys },
        });
      } catch (error) {
        return res.badRequest({ body: error });
      }
    })
  );
}

export function elasticsearchClientPlugin(Client: any, config: unknown, components: any) {
  const ca = components.clientAction.factory;

  Client.prototype.alertingSecurity = components.clientAction.namespaceFactory();
  const alertingSecurity = Client.prototype.alertingSecurity.prototype;

  /**
   * Gets API keys in Elasticsearch
   * @param {boolean} owner A boolean flag that can be used to query API keys owned by the currently authenticated user.
   * Defaults to false. The realm_name or username parameters cannot be specified when this parameter is set to true as
   * they are assumed to be the currently authenticated ones.
   */
  alertingSecurity.canGenerateApiKeys = ca({
    method: 'GET',
    urls: [
      {
        fmt: `/_security/api_key?owner=<%=owner%>`,
        req: {
          owner: {
            type: 'boolean',
            required: true,
          },
        },
      },
    ],
  });
}
