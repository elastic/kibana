/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import { SLACK_CONNECTOR_NAME } from './translations';
import type {
  PostMessageSubActionParams,
  SlackApiService,
  PostMessageResponse,
  SlackAPiResponse,
  ValidChannelResponse,
  GetAllowedChannelsResponse,
  ChannelResponse,
} from '../../../common/slack_api/types';
import {
  retryResultSeconds,
  retryResult,
  serviceErrorResult,
  errorResult,
  successResult,
} from '../../../common/slack_api/lib';
import { SLACK_API_CONNECTOR_ID, SLACK_URL } from '../../../common/slack_api/constants';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';

const buildSlackExecutorErrorResponse = ({
  slackApiError,
  logger,
}: {
  slackApiError: {
    message: string;
    response?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
    };
  };
  logger: Logger;
}) => {
  if (!slackApiError.response) {
    return serviceErrorResult(SLACK_API_CONNECTOR_ID, slackApiError.message);
  }

  const { status, statusText, headers } = slackApiError.response;

  // special handling for 5xx
  if (status >= 500) {
    return retryResult(SLACK_API_CONNECTOR_ID, slackApiError.message);
  }

  // special handling for rate limiting
  if (status === 429) {
    return pipe(
      getRetryAfterIntervalFromHeaders(headers),
      map((retry) => retryResultSeconds(SLACK_API_CONNECTOR_ID, slackApiError.message, retry)),
      getOrElse(() => retryResult(SLACK_API_CONNECTOR_ID, slackApiError.message))
    );
  }

  const errorMessage = i18n.translate(
    'xpack.stackConnectors.slack.unexpectedHttpResponseErrorMessage',
    {
      defaultMessage: 'unexpected http response from slack: {httpStatus} {httpStatusText}',
      values: {
        httpStatus: status,
        httpStatusText: statusText,
      },
    }
  );
  logger.error(`error on ${SLACK_API_CONNECTOR_ID} slack action: ${errorMessage}`);

  return errorResult(SLACK_API_CONNECTOR_ID, errorMessage);
};

const buildSlackExecutorSuccessResponse = <T extends SlackAPiResponse>({
  slackApiResponseData,
}: {
  slackApiResponseData: T;
}): ConnectorTypeExecutorResult<void | T> => {
  if (!slackApiResponseData) {
    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from slack',
      }
    );
    return errorResult(SLACK_API_CONNECTOR_ID, errMessage);
  }

  if (!slackApiResponseData.ok) {
    return serviceErrorResult(SLACK_API_CONNECTOR_ID, slackApiResponseData.error);
  }
  return successResult<T>(SLACK_API_CONNECTOR_ID, slackApiResponseData);
};

export const createExternalService = (
  {
    config,
    secrets,
  }: {
    config?: { allowedChannelIds?: string[] };
    secrets: { token: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): SlackApiService => {
  const { token } = secrets;
  const { allowedChannelIds } = config || { allowedChannelIds: [] };
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

  const validChannelId = async (
    channelId: string
  ): Promise<ConnectorTypeExecutorResult<ValidChannelResponse | void>> => {
    try {
      const validChannel = (): Promise<AxiosResponse<ValidChannelResponse>> => {
        return request<ValidChannelResponse>({
          axios: axiosInstance,
          configurationUtilities,
          logger,
          method: 'get',
          url: `conversations.info?channel=${channelId}`,
        });
      };
      if (channelId.length === 0) {
        return buildSlackExecutorErrorResponse({
          slackApiError: new Error('The channel id is empty'),
          logger,
        });
      }

      const result = await validChannel();

      return buildSlackExecutorSuccessResponse<ValidChannelResponse>({
        slackApiResponseData: result.data,
      });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const postMessage = async ({
    channels,
    channelId = '',
    text,
  }: PostMessageSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      if (
        channelId.length > 0 &&
        allowedChannelIds &&
        allowedChannelIds.length > 0 &&
        !allowedChannelIds.includes(channelId)
      ) {
        return buildSlackExecutorErrorResponse({
          slackApiError: {
            message: `The channel id "${channelId}" is not included in the allowed channels list "${allowedChannelIds.join()}"`,
          },
          logger,
        });
      }

      let channelToUse = channelId;
      if (channelToUse.length === 0 && channels && channels.length > 0 && channels[0].length > 0) {
        channelToUse = channels[0];
      }

      if (channelToUse.length === 0) {
        return buildSlackExecutorErrorResponse({
          slackApiError: {
            message: `The channel is empty"`,
          },
          logger,
        });
      }

      const result: AxiosResponse<PostMessageResponse> = await request({
        axios: axiosInstance,
        method: 'post',
        url: 'chat.postMessage',
        logger,
        data: { channel: channelToUse, text },
        configurationUtilities,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const getAllowedChannels = async (): Promise<
    ConnectorTypeExecutorResult<GetAllowedChannelsResponse | void>
  > => {
    try {
      const validChannel = (channelId: string): Promise<AxiosResponse<ValidChannelResponse>> => {
        return request<ValidChannelResponse>({
          axios: axiosInstance,
          configurationUtilities,
          logger,
          method: 'get',
          url: `conversations.info?channel=${channelId}`,
        });
      };
      const promiseValidChannels = [];
      for (const channelId of allowedChannelIds ?? []) {
        promiseValidChannels.push(validChannel(channelId));
      }
      const validChannels: ChannelResponse[] = [];
      const resultValidChannels = await Promise.all(promiseValidChannels);

      resultValidChannels.forEach((result, resultIdx) => {
        if (result.data.ok && result.data?.channel) {
          validChannels.push(result.data?.channel);
        }
      });

      return buildSlackExecutorSuccessResponse<GetAllowedChannelsResponse>({
        slackApiResponseData: { ok: true, channels: validChannels },
      });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  return {
    validChannelId,
    getAllowedChannels,
    postMessage,
  };
};
