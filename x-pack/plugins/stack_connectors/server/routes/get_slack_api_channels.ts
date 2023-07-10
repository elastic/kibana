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
import { ChannelsResponse, GetChannelsResponse } from '../../common/slack_api/types';

const bodySchema = schema.object({
  authToken: schema.string(),
});

const RE_TRY = 5;
const LIMIT = 1000;

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
    const { authToken } = req.body;

    const axiosInstance = axios.create({
      baseURL: SLACK_URL,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-type': 'application/json; charset=UTF-8',
      },
    });

    const fetchChannels = (cursor: string = ''): Promise<AxiosResponse<GetChannelsResponse>> => {
      return request<GetChannelsResponse>({
        axios: axiosInstance,
        configurationUtilities,
        logger,
        method: 'get',
        url: `conversations.list?exclude_archived=true&types=public_channel,private_channel&limit=${LIMIT}${
          cursor.length > 0 ? `&cursor=${cursor}` : ''
        }`,
      });
    };

    let numberOfFetch = 0;
    let cursor = '';
    const channels: ChannelsResponse[] = [];
    let result: AxiosResponse<GetChannelsResponse> = {
      data: { ok: false, channels },
      status: 0,
      statusText: '',
      headers: {},
      config: {},
    };

    while (numberOfFetch < RE_TRY) {
      result = await fetchChannels(cursor);
      if (result.data.ok && (result.data?.channels ?? []).length > 0) {
        channels.push(...(result.data?.channels ?? []));
      }
      if (
        result.data.ok &&
        result.data.response_metadata &&
        result.data.response_metadata.next_cursor &&
        result.data.response_metadata.next_cursor.length > 0
      ) {
        numberOfFetch += 1;
        cursor = result.data.response_metadata.next_cursor;
      } else {
        break;
      }
    }

    return res.ok({
      body: {
        ...result.data,
        channels,
      },
    });
  }
};
