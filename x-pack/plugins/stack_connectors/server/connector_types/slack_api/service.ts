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
import { generateChartPngStream, generateVegaChartSpec, getChartData } from './vega-chart';
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
    config?: { allowedChannels?: Array<{ id: string; name: string }> };
    secrets: { token: string };
  },
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): SlackApiService => {
  const { token } = secrets;
  const { allowedChannels } = config || { allowedChannels: [] };
  const allowedChannelIds = allowedChannels?.map((ac) => ac.id);

  if (!token) {
    throw Error(`[Action][${SLACK_CONNECTOR_NAME}]: Wrong configuration.`);
  }

  const axiosInstance = axios.create();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json; charset=UTF-8',
  };

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
          headers,
          url: `${SLACK_URL}conversations.info?channel=${channelId}`,
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
    channelIds = [],
    text,
  }: PostMessageSubActionParams): Promise<ConnectorTypeExecutorResult<unknown>> => {
    try {
      if (
        channelIds.length > 0 &&
        allowedChannelIds &&
        allowedChannelIds.length > 0 &&
        !channelIds.every((cId) => allowedChannelIds.includes(cId))
      ) {
        return buildSlackExecutorErrorResponse({
          slackApiError: {
            message: `One of channel ids "${channelIds.join()}" is not included in the allowed channels list "${allowedChannelIds.join()}"`,
          },
          logger,
        });
      }

      // For now, we only allow one channel but we wanted
      // to have a array in case we need to allow multiple channels
      // in one actions
      let channelToUse = channelIds.length > 0 ? channelIds[0] : '';
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

      logger.warn(`original: ${text}`);
      const blocks = getBlocks(text);
      const { text: messageText, chartData } = getChartData(text);
      logger.warn(`chartData: ${JSON.stringify(chartData)}`);

      if (chartData) {
        blocks[0].text.text = messageText;

        const spec = generateVegaChartSpec(chartData);
        const stream = await generateChartPngStream(spec);
        const chartUrl = await uploadChart(stream);
        logger.warn(`chartUrl: ${chartUrl}`);
        blocks.push({
          type: 'image',
          image_url: chartUrl,
          alt_text: 'chart of recent alert data',
        });
      }

      console.log('blocks', JSON.stringify(blocks));
      const result: AxiosResponse<PostMessageResponse> = await request({
        axios: axiosInstance,
        method: 'post',
        url: `${SLACK_URL}chat.postMessage`,
        logger,
        data: { channel: channelToUse, blocks: JSON.stringify(blocks) },
        headers,
        configurationUtilities,
      });

      return buildSlackExecutorSuccessResponse({ slackApiResponseData: result.data });
    } catch (error) {
      console.log(error);
      return buildSlackExecutorErrorResponse({ slackApiError: error, logger });
    }
  };

  interface UploadResponse {
    file: {
      id: string;
    };
  }

  async function uploadChart(stream: ReadableStream): Promise<string> {
    const resultUpload: AxiosResponse<UploadResponse> = await request({
      axios: axiosInstance,
      method: 'post',
      url: `${SLACK_URL}file.upload`,
      logger,
      data: { file: stream },
      headers,
      configurationUtilities,
    });

    const uploadId = resultUpload.data.file.id;

    interface ShareResponse {
      file: {
        permalink: string;
      };
    }

    const resultShared: AxiosResponse<ShareResponse> = await request({
      axios: axiosInstance,
      method: 'post',
      url: `${SLACK_URL}file.sharedPublicURL`,
      logger,
      data: { file: uploadId },
      headers,
      configurationUtilities,
    });

    return resultShared.data.file.permalink;
  }

  return {
    validChannelId,
    postMessage,
    uploadChart,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBlocks(text: string): Array<Record<string, any>> {
  if (text.trim().startsWith('[')) return JSON.parse(text);
  if (text.trim().startsWith('{')) return [JSON.parse(text)];

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text,
      },
    },
  ];
}
