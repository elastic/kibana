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
import {
  ExternalService,
  ExternalServiceCredentials,
  GetChannelsResponse,
  PostMessageResponse,
  PostMessageParams,
} from './types';
import { SLACK_CONNECTOR_NAME } from './translations';
import type { SlackSecrets } from '../../../common/slack/types';

const SLACK_URL = 'https://slack.com/api/';

export const createExternalService = (
  { secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { token } = secrets as SlackSecrets;

  if (!token) {
    throw Error(`[Action]${SLACK_CONNECTOR_NAME}: Wrong configuration.`);
  }

  const axiosInstance = axios.create({
    baseURL: SLACK_URL,
    headers: {
      Authorization: `Bearer ${secrets.token}`,
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
          `Unable to get Channels. Error: ${error.message}.` // Maybe reuse createErrorMessage?
        )
      );
    }
  };

  const postMessage = async ({
    channel,
    text,
  }: PostMessageParams): Promise<PostMessageResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: 'post',
        url: SLACK_URL,
        logger,
        data: { body: { channel, text } },
        configurationUtilities,
      });

      return res.data as PostMessageResponse;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          SLACK_CONNECTOR_NAME,
          `Unable to create comment at incident with id. Error: ${error.message}.` // Maybe reuse createErrorMessage?
        )
      );
    }
  };

  return {
    getChannels,
    postMessage,
  };
};
