/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { request, getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { SlackService, PostMessageResponse, PostMessageResponseList } from './types';
import { SLACK_CONNECTOR_NAME } from './translations';
import type { GetChannelsResponse, PostMessageParams } from '../../../common/slack/types';
import { SLACK_URL } from '../../../common/slack/constants';

export const createExternalService = (
  { secrets }: { secrets: { token: string } },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): SlackService => {
  const { token } = secrets;

  if (!token) {
    throw Error(`[Action][${SLACK_CONNECTOR_NAME}]: Wrong configuration.`);
  }

  const axiosInstance = axios.create({
    baseURL: SLACK_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-type': 'application/json; charset=UTF-8',
    },
  });

  const getChannels = async (): Promise<GetChannelsResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        configurationUtilities,
        logger,
        method: 'get',
        url: 'conversations.list?types=public_channel,private_channel',
      });

      return res.data as GetChannelsResponse;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          SLACK_CONNECTOR_NAME,
          `Unable to get slack channels. Error: ${error.message}.`
        )
      );
    }
  };

  const postMessageInOneChannel = async ({
    channel,
    text,
  }: {
    channel: string;
    text: string;
  }): Promise<PostMessageResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'post',
        url: 'chat.postMessage',
        logger,
        data: { channel, text },
        configurationUtilities,
      });

      return res.data as PostMessageResponse;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          SLACK_CONNECTOR_NAME,
          `Unable to post a message in the Slack. Error: ${error.message}.`
        )
      );
    }
  };

  const postMessage = async ({
    channels,
    text,
  }: PostMessageParams): Promise<PostMessageResponseList> => {
    return await Promise.all(
      channels.map(async (channel) => await postMessageInOneChannel({ channel, text }))
    );
  };

  return {
    getChannels,
    postMessage,
  };
};
