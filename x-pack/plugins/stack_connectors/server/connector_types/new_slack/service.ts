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
  // SlackPublicConfigurationType,
  SlackSecretConfigurationType,
  GetChannelsResponse,
  PostMessageResponse,
  PostMessageParams,
} from './types';
import * as i18n from './translations';

const SLACK_URL = 'https://slack.com/api/';

export const createExternalService = (
  { secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  // const { url } = config as SlackPublicConfigurationType;
  const { token } = secrets as SlackSecretConfigurationType;

  if (!token) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const axiosInstance = axios.create({
    baseURL: SLACK_URL,
    headers: {
      Authorization: `Bearer ${secrets.token}`,
    },
  });

  const getChannels = async (): Promise<GetChannelsResponse> => ({});
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
          i18n.NAME,
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
