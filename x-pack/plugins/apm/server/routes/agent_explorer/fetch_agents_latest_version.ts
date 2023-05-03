/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import fetch from 'node-fetch';
import {
  ElasticApmAgentLatestVersion,
  OtelAgentLatestVersion,
} from '../../../common/agent_explorer';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { ErrorWithStatusCode } from './error_with_status_code';

const MISSING_CONFIGURATION = i18n.translate(
  'xpack.apm.agent_explorer.error.missing_configuration',
  {
    defaultMessage:
      'To use latest agent versions you must set xpack.apm.latestAgentVersionsUrl.',
  }
);

export interface AgentLatestVersionsResponse {
  data: AgentLatestVersions;
  error?: { message: string; type?: string; statusCode?: string };
}

type AgentLatestVersions = Record<
  AgentName,
  ElasticApmAgentLatestVersion | OtelAgentLatestVersion
>;

export const fetchAgentsLatestVersion = async (
  logger: Logger,
  latestAgentVersionsUrl: string
): Promise<AgentLatestVersionsResponse> => {
  if (isEmpty(latestAgentVersionsUrl)) {
    throw Boom.notImplemented(MISSING_CONFIGURATION);
  }

  try {
    const response = await fetch(latestAgentVersionsUrl);

    if (response.status !== 200) {
      throw new ErrorWithStatusCode(
        `${response.status} - ${await response.text()}`,
        `${response.status}`
      );
    }

    const data = await response.json();

    return { data };
  } catch (error) {
    const message = `Failed to retrieve latest APM Agent versions due to ${error}`;
    logger.warn(message);

    return {
      data: {} as AgentLatestVersions,
      error,
    };
  }
};
