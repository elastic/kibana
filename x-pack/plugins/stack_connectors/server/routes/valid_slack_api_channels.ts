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
import axios, { AxiosResponse } from 'axios';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';
import { SLACK_URL } from '../../common/slack_api/constants';
import { ValidChannelResponse } from '../../common/slack_api/types';

const bodySchema = schema.object({
  authToken: schema.string(),
  channelIds: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 25 }),
});

export const validSlackApiChannelsRoute = (
  router: IRouter,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels/_valid`,
      validate: {
        body: bodySchema,
      },
    },
    handler
  );

  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, { authToken: string; channelIds: string[] }>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const { authToken, channelIds } = req.body;

    const axiosInstance = axios.create();

    const validChannelId = (
      channelId: string = ''
    ): Promise<AxiosResponse<ValidChannelResponse>> => {
      return request<ValidChannelResponse>({
        axios: axiosInstance,
        configurationUtilities,
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-type': 'application/json; charset=UTF-8',
        },
        logger,
        method: 'get',
        url: `${SLACK_URL}conversations.info?channel=${channelId}`,
      });
    };

    const promiseValidChannels = [];
    for (const channelId of channelIds) {
      promiseValidChannels.push(validChannelId(channelId));
    }
    const validChannels: Array<{ id: string; name: string }> = [];
    const invalidChannels: string[] = [];
    const resultValidChannels = await Promise.all(promiseValidChannels);

    resultValidChannels.forEach((result, resultIdx) => {
      if (result.data.ok && result.data?.channel) {
        const { id, name } = result.data?.channel;
        validChannels.push({ id, name });
      } else if (result.data.error && channelIds[resultIdx]) {
        invalidChannels.push(channelIds[resultIdx]);
      }
    });

    return res.ok({
      body: {
        validChannels,
        invalidChannels,
      },
    });
  }
};
