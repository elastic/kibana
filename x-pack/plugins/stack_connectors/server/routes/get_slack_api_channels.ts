/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import axios from 'axios';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';
import { SLACK_URL } from '../../common/slack_api/constants';
import { GetChannelsResponse } from '../../common/slack_api/types';

const bodySchema = schema.object({
  authToken: schema.string(),
});

export const getSlackApiChannelsRoute = (
  router: IRouter,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels`,
      validate: {
        body: bodySchema,
      },
    },
    handler
  );

  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, { authToken: string }>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    try {
      const { authToken } = req.body;

      const axiosInstance = axios.create({
        baseURL: SLACK_URL,
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-type': 'application/json; charset=UTF-8',
        },
      });

      const result = await request<GetChannelsResponse>({
        axios: axiosInstance,
        configurationUtilities,
        logger,
        method: 'get',
        url: 'conversations.list?types=public_channel,private_channel',
      });

      return res.ok({
        body: result.data,
      });
    } catch (err) {
      throw err;
    }
  }
};
