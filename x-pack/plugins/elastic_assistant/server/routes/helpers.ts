/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { Logger } from '@kbn/core/server';
import { Message, TraceData } from '@kbn/elastic-assistant-common';
import { ILicense } from '@kbn/licensing-plugin/server';
import { AwaitedProperties } from '@kbn/utility-types';
import { AssistantFeatureKey } from '@kbn/elastic-assistant-common/impl/capabilities';
import { MINIMUM_AI_ASSISTANT_LICENSE } from '../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../types';
import { buildResponse } from './utils';

interface GetPluginNameFromRequestParams {
  request: KibanaRequest;
  defaultPluginName: string;
  logger?: Logger;
}

export const DEFAULT_PLUGIN_NAME = 'securitySolutionUI';

/**
 * Attempts to extract the plugin name the request originated from using the request headers.
 *
 * Note from Kibana Core: This is not a 100% fit solution, though, because plugins can run in the background,
 * or even use other plugins’ helpers (ie, APM can use the infra helpers to call a third plugin)
 *
 * Should suffice for our purposes here with where the Elastic Assistant is currently used, but if needing a
 * dedicated solution, the core folks said to reach out.
 *
 * @param logger optional logger to log any errors
 * @param defaultPluginName default plugin name to use if unable to determine from request
 * @param request Kibana Request
 *
 * @returns plugin name
 */
export const getPluginNameFromRequest = ({
  logger,
  defaultPluginName,
  request,
}: GetPluginNameFromRequestParams): string => {
  try {
    const contextHeader = request.headers['x-kbn-context'];
    if (contextHeader != null) {
      return JSON.parse(
        decodeURIComponent(Array.isArray(contextHeader) ? contextHeader[0] : contextHeader)
      )?.name;
    }
  } catch (err) {
    logger?.error(
      `Error determining source plugin for selecting tools, using ${defaultPluginName}.`
    );
  }
  return defaultPluginName;
};

export const getMessageFromRawResponse = ({
  rawContent,
  isError,
  traceData,
}: {
  rawContent?: string;
  traceData?: TraceData;
  isError?: boolean;
}): Message => {
  const dateTimeString = new Date().toISOString();
  if (rawContent) {
    return {
      role: 'assistant',
      content: rawContent,
      timestamp: dateTimeString,
      isError,
      traceData,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
      isError: true,
    };
  }
};

export const hasAIAssistantLicense = (license: ILicense): boolean =>
  license.hasAtLeast(MINIMUM_AI_ASSISTANT_LICENSE);

export const UPGRADE_LICENSE_MESSAGE =
  'Your license does not support AI Assistant. Please upgrade your license.';

interface PerformChecksParams {
  authenticatedUser?: boolean;
  capability?: AssistantFeatureKey;
  context: AwaitedProperties<
    Pick<ElasticAssistantRequestHandlerContext, 'elasticAssistant' | 'licensing' | 'core'>
  >;
  license?: boolean;
  request: KibanaRequest;
  response: KibanaResponseFactory;
}

/**
 * Helper to perform checks for authenticated user, capability, and license. Perform all or one
 * of the checks by providing relevant optional params. Check order is license, authenticated user,
 * then capability.
 *
 * @param authenticatedUser - Whether to check for an authenticated user
 * @param capability - Specific capability to check if enabled, e.g. `assistantModelEvaluation`
 * @param context - Route context
 * @param license - Whether to check for a valid license
 * @param request - Route KibanaRequest
 * @param response - Route KibanaResponseFactory
 */
export const performChecks = ({
  authenticatedUser,
  capability,
  context,
  license,
  request,
  response,
}: PerformChecksParams): IKibanaResponse | undefined => {
  const assistantResponse = buildResponse(response);

  if (license) {
    if (!hasAIAssistantLicense(context.licensing.license)) {
      return response.forbidden({
        body: {
          message: UPGRADE_LICENSE_MESSAGE,
        },
      });
    }
  }

  if (authenticatedUser) {
    if (context.elasticAssistant.getCurrentUser() == null) {
      return assistantResponse.error({
        body: `Authenticated user not found`,
        statusCode: 401,
      });
    }
  }

  if (capability) {
    const pluginName = getPluginNameFromRequest({
      request,
      defaultPluginName: DEFAULT_PLUGIN_NAME,
    });
    const registeredFeatures = context.elasticAssistant.getRegisteredFeatures(pluginName);
    if (!registeredFeatures[capability]) {
      return response.notFound();
    }
  }

  return undefined;
};
