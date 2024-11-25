/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import type { ElasticsearchClient, LogMeta, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import apm from 'elastic-apm-node';

import { SO_SEARCH_LIMIT } from '../../constants';
import type { AgentPolicy } from '../../types';
import type { AgentlessApiResponse } from '../../../common/types';
import {
  AgentlessAgentConfigError,
  AgentlessAgentCreateError,
  AgentlessAgentDeleteError,
} from '../../errors';
import {
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
} from '../../constants';

import { appContextService } from '../app_context';

import { listEnrollmentApiKeys } from '../api_keys';
import { listFleetServerHosts } from '../fleet_server_host';
import type { AgentlessConfig } from '../utils/agentless';
import { prependAgentlessApiBasePathToEndpoint, isAgentlessApiEnabled } from '../utils/agentless';

class AgentlessAgentService {
  public async createAgentlessAgent(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentlessAgentPolicy: AgentPolicy
  ) {
    const traceId = apm.currentTransaction?.traceparent;
    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const logger = appContextService.getLogger();
    logger.debug(`[Agentless API] Creating agentless agent ${agentlessAgentPolicy.id}`);

    const agentlessConfig = appContextService.getConfig()?.agentless;
    if (!agentlessConfig) {
      logger.error('[Agentless API] Missing agentless configuration', errorMetadata);
      throw new AgentlessAgentConfigError('missing Agentless API configuration in Kibana');
    }

    if (!isAgentlessApiEnabled()) {
      logger.error(
        '[Agentless API] Agentless agents are only supported in cloud deployment and serverless projects'
      );
      throw new AgentlessAgentConfigError(
        'Agentless agents are only supported in cloud deployment and serverless projects'
      );
    }
    if (!agentlessAgentPolicy.supports_agentless) {
      logger.error('[Agentless API] Agentless agent policy does not have agentless enabled');
      throw new AgentlessAgentConfigError(
        'Agentless agent policy does not have supports_agentless enabled'
      );
    }

    const policyId = agentlessAgentPolicy.id;
    const { fleetUrl, fleetToken } = await this.getFleetUrlAndTokenForAgentlessAgent(
      esClient,
      policyId,
      soClient
    );

    logger.debug(
      `[Agentless API] Creating agentless agent with fleetUrl ${fleetUrl} and fleet_token: [REDACTED]`
    );

    logger.debug(
      `[Agentless API] Creating agentless agent with TLS cert: ${
        agentlessConfig?.api?.tls?.certificate ? '[REDACTED]' : 'undefined'
      } and TLS key: ${agentlessConfig?.api?.tls?.key ? '[REDACTED]' : 'undefined'}
      and TLS ca: ${agentlessConfig?.api?.tls?.ca ? '[REDACTED]' : 'undefined'}`
    );
    const tlsConfig = this.createTlsConfig(agentlessConfig);

    const labels = this.getAgentlessTags(agentlessAgentPolicy);

    const requestConfig: AxiosRequestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(agentlessConfig, '/deployments'),
      data: {
        policy_id: policyId,
        fleet_url: fleetUrl,
        fleet_token: fleetToken,
        labels,
      },
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-Request-ID': traceId,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
        ca: tlsConfig.certificateAuthorities,
      }),
    };

    const cloudSetup = appContextService.getCloud();
    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[Agentless API] Creating agentless agent with request config ${requestConfigDebugStatus}`
    );

    const response = await axios<AgentlessApiResponse>(requestConfig).catch(
      (error: Error | AxiosError) => {
        this.catchAgentlessApiError(
          'create',
          error,
          logger,
          agentlessAgentPolicy.id,
          requestConfig,
          requestConfigDebugStatus,
          errorMetadata,
          traceId
        );
      }
    );

    logger.debug(`[Agentless API] Created an agentless agent ${response}`);
    return response;
  }

  public async deleteAgentlessAgent(agentlessPolicyId: string) {
    const logger = appContextService.getLogger();
    const agentlessConfig = appContextService.getConfig()?.agentless;
    const tlsConfig = this.createTlsConfig(agentlessConfig);
    const requestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(
        agentlessConfig,
        `/deployments/${agentlessPolicyId}`
      ),
      method: 'DELETE',
      headers: {
        'Content-type': 'application/json',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
        ca: tlsConfig.certificateAuthorities,
      }),
    };
    const traceId = apm.currentTransaction?.traceparent;
    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[Agentless API] Start deleting agentless agent for agent policy ${requestConfigDebugStatus}`
    );

    if (!isAgentlessApiEnabled) {
      logger.error(
        '[Agentless API] Agentless API is not supported. Deleting agentless agent is not supported in non-cloud or non-serverless environments'
      );
    }

    if (!agentlessConfig) {
      logger.error('[Agentless API] kibana.yml is currently missing Agentless API configuration');
    }

    logger.debug(`[Agentless API] Deleting agentless agent with TLS config with certificate`);

    logger.debug(
      `[Agentless API] Deleting agentless deployment with request config ${requestConfigDebugStatus}`
    );

    const response = await axios(requestConfig).catch((error: AxiosError) => {
      this.catchAgentlessApiError(
        'delete',
        error,
        logger,
        agentlessPolicyId,
        requestConfig,
        requestConfigDebugStatus,
        errorMetadata,
        traceId
      );
    });

    return response;
  }

  private getAgentlessTags(agentlessAgentPolicy: AgentPolicy) {
    if (!agentlessAgentPolicy.global_data_tags) {
      return undefined;
    }

    const getGlobalTagValueByName = (name: string) =>
      agentlessAgentPolicy.global_data_tags?.find((tag) => tag.name === name)?.value;

    return {
      owner: {
        org: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION),
        division: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_DIVISION),
        team: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_TEAM),
      },
    };
  }

  private withRequestIdMessage(message: string, traceId?: string) {
    return `${message} [Request Id: ${traceId}]`;
  }

  private createTlsConfig(agentlessConfig: AgentlessConfig | undefined) {
    return new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: agentlessConfig?.api?.tls?.certificate,
        key: agentlessConfig?.api?.tls?.key,
        certificateAuthorities: agentlessConfig?.api?.tls?.ca,
      })
    );
  }

  private async getFleetUrlAndTokenForAgentlessAgent(
    esClient: ElasticsearchClient,
    policyId: string,
    soClient: SavedObjectsClientContract
  ) {
    const { items: enrollmentApiKeys } = await listEnrollmentApiKeys(esClient, {
      perPage: SO_SEARCH_LIMIT,
      showInactive: true,
      kuery: `policy_id:"${policyId}"`,
    });

    const { items: fleetHosts } = await listFleetServerHosts(soClient);
    // Tech Debt: change this when we add the internal fleet server config to use the internal fleet server host
    // https://github.com/elastic/security-team/issues/9695
    const defaultFleetHost =
      fleetHosts.length === 1 ? fleetHosts[0] : fleetHosts.find((host) => host.is_default);

    if (!defaultFleetHost) {
      throw new AgentlessAgentConfigError('missing default Fleet server host');
    }
    if (!enrollmentApiKeys.length) {
      throw new AgentlessAgentConfigError('missing Fleet enrollment token');
    }
    const fleetToken = enrollmentApiKeys[0].api_key;
    const fleetUrl = defaultFleetHost?.host_urls[0];
    return { fleetUrl, fleetToken };
  }

  private createRequestConfigDebug(requestConfig: AxiosRequestConfig<any>) {
    return JSON.stringify({
      ...requestConfig,
      data: {
        ...requestConfig.data,
        fleet_token: '[REDACTED]',
      },
      httpsAgent: {
        ...requestConfig.httpsAgent,
        options: {
          ...requestConfig.httpsAgent.options,
          cert: requestConfig.httpsAgent.options.cert ? 'REDACTED' : undefined,
          key: requestConfig.httpsAgent.options.key ? 'REDACTED' : undefined,
          ca: requestConfig.httpsAgent.options.ca ? 'REDACTED' : undefined,
        },
      },
    });
  }

  private catchAgentlessApiError(
    action: 'create' | 'delete',
    error: Error | AxiosError,
    logger: Logger,
    agentlessPolicyId: string,
    requestConfig: AxiosRequestConfig,
    requestConfigDebugStatus: string,
    errorMetadata: LogMeta,
    traceId?: string
  ) {
    const errorMetadataWithRequestConfig: LogMeta = {
      ...errorMetadata,
      http: {
        request: {
          id: traceId,
          body: requestConfig.data,
        },
      },
    };

    const errorLogCodeCause = (axiosError: AxiosError) =>
      `${axiosError.code}  ${this.convertCauseErrorsToString(axiosError)}`;

    if (!axios.isAxiosError(error)) {
      logger.error(
        `${
          action === 'create'
            ? `[Agentless API] Creating agentless failed with an error that is not an AxiosError for agentless policy`
            : `[Agentless API] Deleting agentless deployment failed with an error that is not an Axios error for agentless policy`
        } ${error} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(action, error.message, traceId);
    }

    const ERROR_HANDLING_MESSAGES = this.getErrorHandlingMessages(agentlessPolicyId);

    if (error.response) {
      if (error.response.status in ERROR_HANDLING_MESSAGES) {
        const handledResponseErrorMessage =
          ERROR_HANDLING_MESSAGES[error.response.status as keyof typeof ERROR_HANDLING_MESSAGES][
            action
          ];
        this.handleResponseError(
          action,
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          handledResponseErrorMessage.log,
          handledResponseErrorMessage.message,
          traceId
        );
      } else {
        const unhandledResponseErrorMessage = ERROR_HANDLING_MESSAGES.unhandled_response[action];
        // The request was made and the server responded with a status code and error data
        this.handleResponseError(
          action,
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          unhandledResponseErrorMessage.log,
          unhandledResponseErrorMessage.message,
          traceId
        );
      }
    } else if (error.request) {
      // The request was made but no response was received
      const requestErrorMessage = ERROR_HANDLING_MESSAGES.request_error[action];
      logger.error(
        `${requestErrorMessage.log} ${errorLogCodeCause(error)} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(action, requestErrorMessage.message, traceId);
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(
        `[Agentless API] ${
          action === 'create' ? 'Creating' : 'Deleting'
        } the agentless agent failed ${errorLogCodeCause(error)} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(
        action,
        `the Agentless API could not ${action} the agentless agent`,
        traceId
      );
    }
  }

  private handleResponseError(
    action: 'create' | 'delete',
    response: AxiosResponse,
    logger: Logger,
    errorMetadataWithRequestConfig: LogMeta,
    requestConfigDebugStatus: string,
    logMessage: string,
    userMessage: string,
    traceId?: string
  ) {
    logger.error(
      `${logMessage} ${JSON.stringify(response.status)} ${JSON.stringify(
        response.data
      )}} ${requestConfigDebugStatus}`,
      {
        ...errorMetadataWithRequestConfig,
        http: {
          ...errorMetadataWithRequestConfig.http,
          response: {
            status_code: response?.status,
            body: response?.data,
          },
        },
      }
    );

    throw this.getAgentlessAgentError(action, userMessage, traceId);
  }

  private convertCauseErrorsToString = (error: AxiosError) => {
    if (error.cause instanceof AggregateError) {
      return error.cause.errors.map((e: Error) => e.message);
    }
    return error.cause;
  };

  private getAgentlessAgentError(action: string, userMessage: string, traceId: string | undefined) {
    return action === 'create'
      ? new AgentlessAgentCreateError(this.withRequestIdMessage(userMessage, traceId))
      : new AgentlessAgentDeleteError(this.withRequestIdMessage(userMessage, traceId));
  }

  private getErrorHandlingMessages(agentlessPolicyId: string) {
    return {
      400: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 400, bad request for agentless policy.',
          message:
            'the Agentless API could not create the agentless agent. Please delete the agentless policy and try again or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 400, bad request for agentless policy',
          message:
            'the Agentless API could not create the agentless agent. Please delete the agentless policy try again or contact your administrator.',
        },
      },
      401: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 401 unauthorized for agentless policy.',
          message:
            'the Agentless API could not create the agentless agent because an unauthorized request was sent. Please delete the agentless policy and try again or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 401 unauthorized for agentless policy.  Check the Kibana Agentless API tls configuration',
          message:
            'the Agentless API could not delete the agentless deployment because an unauthorized request was sent. Please try again or contact your administrator.',
        },
      },
      403: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 403 forbidden for agentless policy. Check the Kibana Agentless API configuration and endpoints.',
          message:
            'the Agentless API could not create the agentless agent because a forbidden request was sent. Please delete the agentless policy and try again or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 403 forbidden for agentless policy. Check the Kibana Agentless API configuration and endpoints.',
          message:
            'the Agentless API could not delete the agentless deployment because a forbidden request was sent. Please try again or contact your administrator.',
        },
      },
      404: {
        // this is likely to happen when creating agentless agents, but covering it in case
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 404 not found.',
          message:
            'the Agentless API could not create the agentless agent because it returned a 404 error not found.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 404 not found',
          message: `the Agentless API could not delete the agentless deployment ${agentlessPolicyId} because it could not be found.`,
        },
      },
      408: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 408, the request timed out',
          message:
            'the Agentless API request timed out waiting for the agentless agent status to respond, please wait a few minutes for the agent to enroll with fleet. If agent fails to enroll with Fleet please delete the agentless policy try again or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 408, the request timed out',
          message: `the Agentless API could not delete the agentless deployment ${agentlessPolicyId} because the request timed out, please wait a few minutes for the agentless agent deployment to be removed. If it continues to persist please try again or contact your administrator.`,
        },
      },
      429: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 429 for agentless policy, agentless agent limit has been reached for this deployment or project.',
          message:
            'the Agentless API could not create the agentless agent, you have reached the limit of agentless agents provisioned for this deployment or project.  Consider removing some agentless agents and try again or use agent-based agents for this integration.',
        },
        // this is likely to happen when deleting agentless agents, but covering it in case
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 429 for agentless policy, agentless agent limit has been reached for this deployment or project.',
          message:
            'the Agentless API could not delete the agentless deployment, you have reached the limit of agentless agents provisioned for this deployment or project.  Consider removing some agentless agents and try again or use agent-based agents for this integration.',
        },
      },
      500: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 500 internal service error.',
          message:
            'the Agentless API could not create the agentless agent because it returned a 500 internal error. Please delete the agentless policy and try again later or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 500 internal service error.',
          message:
            'the Agentless API could not delete the agentless deployment because it returned a 500 internal error. Please try again later or contact your administrator.',
        },
      },
      unhandled_response: {
        create: {
          log: '[Agentless API] Creating agentless agent failed because the Agentless API responded with an unhandled status code that falls out of the range of 2xx:',
          message:
            'the Agentless API could not create the agentless agent due to an unexpected error. Please delete the agentless policy and try again later or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting agentless deployment failed because the Agentless API responded with an unhandled status code that falls out of the range of 2xx:',
          message: `the Agentless API could not delete the agentless deployment ${agentlessPolicyId}. Please try again later or contact your administrator.`,
        },
      },
      request_error: {
        create: {
          log: '[Agentless API] Creating agentless agent failed with a request error:',
          message:
            'the Agentless API could not create the agentless agent due to a request error. Please delete the agentless policy and try again later or contact your administrator.',
        },
        delete: {
          log: '[Agentless API] Deleting agentless deployment failed with a request error:',
          message:
            'the Agentless API could not delete the agentless deployment due to a request error. Please try again later or contact your administrator.',
        },
      },
    };
  }
}

export const agentlessAgentService = new AgentlessAgentService();
