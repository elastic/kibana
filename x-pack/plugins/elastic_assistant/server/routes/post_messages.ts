/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { notImplemented } from '@hapi/boom';
import { Conversations } from '../schemas/conversations';
import { buildRouteValidation } from '../schemas/common';
import { AIAssistantStoreService } from '../lib/store/service';
import { STORE_PATH } from '../../common/constants';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../types';

export const postMessagesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  service: AIAssistantStoreService
) => {
  router.post(
    {
      path: STORE_PATH,
      validate: {
        body: buildRouteValidation(Conversations),
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);
      const client = await service.getClient({ request });

      console.log('hello0');
      if (!client) {
        throw notImplemented();
      }

      try {
        console.log('hello1');
        const result = await client.initializeFromConversationStore(request.body);
        console.log('Conversations request.body', result);
        return response.ok({
          body: request.body,
        });
      } catch (err) {
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
