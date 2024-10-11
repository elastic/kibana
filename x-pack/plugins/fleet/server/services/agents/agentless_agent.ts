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
import { AgentlessAgentCreateError } from '../../errors';

import { appContextService } from '../app_context';

import { listEnrollmentApiKeys } from '../api_keys';
import { listFleetServerHosts } from '../fleet_server_host';
import type { AgentlessConfig } from '../utils/agentless';
import {
  prependAgentlessApiBasePathToEndpoint,
  isAgentlessApiEnabled,
  getDeletionEndpointPath,
} from '../utils/agentless';

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

    if (!isAgentlessApiEnabled) {
      logger.error(
        '[Agentless API] Creating agentless agent not supported in non-cloud or non-serverless environments'
      );
      throw new AgentlessAgentCreateError('Agentless agent not supported');
    }
    if (!agentlessAgentPolicy.supports_agentless) {
      logger.error('[Agentless API] Agentless agent policy does not have agentless enabled');
      throw new AgentlessAgentCreateError('Agentless agent policy does not have agentless enabled');
    }

    const agentlessConfig = appContextService.getConfig()?.agentless;
    if (!agentlessConfig) {
      logger.error('[Agentless API] Missing agentless configuration', errorMetadata);
      throw new AgentlessAgentCreateError('missing agentless configuration');
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

    const requestConfig: AxiosRequestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(agentlessConfig, '/deployments'),
      data: {
        policy_id: policyId,
        fleet_url: fleetUrl,
        fleet_token: fleetToken,
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
            ? '[Agentless API] Creating agentless failed with an error '
            : '[Agentless API] Deleting agentless deployment failed with an error'
        } ${error} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );
      throw new AgentlessAgentCreateError(this.withRequestIdMessage(error.message, traceId));
    }

    if (error.response) {
      if (error.response.status === 400) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          action === 'create'
            ? '[Agentless API] Creating the agentless agent failed with a status 400, bad request.'
            : '[Agentless API] Deleting the agentless deployment failed with a status 400, bad request.',
          action === 'create'
            ? 'the Agentless API could not create the agentless agent, please delete the agentless policy try again or contact your administrator.'
            : 'the Agentless API could not delete the agentless deployment, please try again or contact your administrator.',
          traceId
        );
      }
      if (error.response.status === 401) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          action === 'create'
            ? '[Agentless API] Creating the agentless agent failed with a status 401 unauthorized.  Check the Kibana Agentless API tls configuration'
            : '[Agentless API] Deleting the agentless deployment failed with a status 401 unauthorized.  Check the Kibana Agentless API tls configuration',
          action === 'create'
            ? 'the Agentless API could not create the agentless agent because an unauthorized request was sent. Please delete the agentless policy and try again or contact your administrator.'
            : 'the Agentless API could not delete the agentless deployment because an unauthorized request was sent. Please try again or contact your administrator.',
          traceId
        );
      }
      if (error.response.status === 403) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          action === 'create'
            ? '[Agentless API] Creating the agentless agent failed with a status 403 forbidden. Check the Kibana Agentless API configuration.'
            : '[Agentless API] Deleting the agentless deployment failed with a status 403 forbidden. Check the Kibana Agentless API configuration.',
          action === 'create'
            ? 'the Agentless API could not create the agentless agent because a forbidden request was sent. Please delete the agentless policy and try again or contact your administrator.'
            : 'the Agentless API could not delete the agentless deployment because a forbidden request was sent. Please try again or contact your administrator.',
          traceId
        );
      }
      if (error.response.status === 404) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          // this error will only happen when deleting agentless agents, but covering the case for creating agentless agents
          action === 'create'
            ? `[Agentless API] Creating the agentless agent failed with a status 404 not found for agentless policy ${agentlessPolicyId}.`
            : `[Agentless API] Deleting the agentless deployment failed with a status 404 not found for agentless policy ${agentlessPolicyId}.`,
          action === 'create'
            ? 'the Agentless API could not create the agentless agent because it returned a 404 error not found.'
            : `the Agentless API could not delete the agentless deployment ${agentlessPolicyId} because an unauthorized request was sent. Please try again or contact your administrator.`,
          traceId
        );
      }
      if (error.response.status >= 408) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          action === 'create'
            ? '[Agentless API] Creating the agentless agent failed with a status 408, the request timed out.'
            : '[Agentless API] Deleting the agentless deployment failed with a status 408, the request timed out.',
          action === 'create'
            ? 'the Agentless API could not create the agentless agent because the request timed out, please delete the agentless policy try again or contact your administrator.'
            : 'the Agentless API could not delete the agentless deployment because the request timed out, please try again or contact your administrator.',
          traceId
        );
      }
      if (error.response.status === 429) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          // this error will only happen when creating agentless agents
          '[Agentless API] Creating the agentless agent failed with a status 429, agentless agent limit has been reached for this deployment or project.',
          `the Agentless API could not create the agentless agent, you have reached the limit of agentless agents provisioned for this deployment or project.  Consider removing some agentless agents and try again or use agent-based agents for this integration.`,
          traceId
        );
      }
      if (error.response.status === 500) {
        this.handleResponseError(
          error.response,
          logger,
          errorMetadataWithRequestConfig,
          requestConfigDebugStatus,
          action === 'create'
            ? '[Agentless API] Creating the agentless agent failed with a status 500 internal service error.'
            : '[Agentless API] Deleting the agentless deployment failed with a status 500 internal service error.',
          action === 'create'
            ? 'the Agentless API could not create the agentless agent, please delete the agentless policy and try again later  or contact your administrator.'
            : 'the Agentless API could not delete the agentless deployment, please try again later or contact your administrator.',
          traceId
        );
      }
      // The request was made and the server responded with a status code and error data
      this.handleResponseError(
        error.response,
        logger,
        errorMetadataWithRequestConfig,
        requestConfigDebugStatus,
        '[Agentless API] Creating agentless agent failed because the Agentless API responding with a status code that falls out of the range of 2xx:',
        'the Agentless API could not create the agentless agent, please delete the agentless policy and try again later or contact your administrator.',
        traceId
      );
    } else if (error.request) {
      // The request was made but no response was received

      const logMessage =
        action === 'create'
          ? '[Agentless API] Creating agentless agent failed while sending the request to the Agentless API:'
          : '[Agentless API] Deleting agentless deployment failed while sending the request to the Agentless API:';

      const thrownMessage =
        action === 'create'
          ? 'no response received from the Agentless API when attempting to create the agentless agent, please delete the agentless policy and try again later or contact your administrator.'
          : 'no response received from the Agentless API when attempting to delete the agentless deployment, please try again later or contact your administrator.';

      logger.error(
        `${logMessage} ${errorLogCodeCause(error)} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );
      throw new AgentlessAgentCreateError(this.withRequestIdMessage(thrownMessage, traceId));
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(
        `[Agentless API] Creating agentless agent failed to be created ${errorLogCodeCause(
          error
        )} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );
      throw new AgentlessAgentCreateError(
        this.withRequestIdMessage('the Agentless API could not create the agentless agent', traceId)
      );
    }
  }

  private handleResponseError(
    response: AxiosResponse,
    logger: Logger,
    errorMetadataWithRequestConfig: LogMeta,
    requestConfigDebugStatus: string,
    logMessage: string,
    userMessage: string,
    traceId?: string
  ) {
    logger.error(
      `${logMessage} ${JSON.stringify(response.status)}} ${JSON.stringify(
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

    throw new AgentlessAgentCreateError(this.withRequestIdMessage(userMessage, traceId));
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

  private convertCauseErrorsToString = (error: AxiosError) => {
    if (error.cause instanceof AggregateError) {
      return error.cause.errors.map((e: Error) => e.message);
    }
    return error.cause;
  };

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
      throw new AgentlessAgentCreateError('missing Fleet server host');
    }
    if (!enrollmentApiKeys.length) {
      throw new AgentlessAgentCreateError('missing Fleet enrollment token');
    }
    const fleetToken = enrollmentApiKeys[0].api_key;
    const fleetUrl = defaultFleetHost?.host_urls[0];
    return { fleetUrl, fleetToken };
  }
}

export const agentlessAgentService = new AgentlessAgentService();
