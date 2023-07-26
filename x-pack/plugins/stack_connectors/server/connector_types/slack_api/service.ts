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
  GetChannelsResponse,
  SlackAPiResponse,
  ChannelsResponse,
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

const RE_TRY = 5;
const LIMIT = 1000;

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
  { secrets }: { secrets: { token: string } },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): SlackApiService => {
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

  const getChannels = async (): Promise<
    ConnectorTypeExecutorResult<GetChannelsResponse | void>
  > => {
    try {
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
      result.data.channels = channels;
      const responseData = result.data;

      return buildSlackExecutorSuccessResponse<GetChannelsResponse>({
        slackApiResponseData: responseData,
      });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  const postMessage = async ({
    channels,
    text,
  }: PostMessageSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      const result: AxiosResponse<PostMessageResponse> = await request({
        axios: axiosInstance,
        method: 'post',
        url: 'chat.postMessage',
        logger,
        data: { channel: channels[0], text },
        configurationUtilities,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  return {
    getChannels,
    postMessage,
  };
};
