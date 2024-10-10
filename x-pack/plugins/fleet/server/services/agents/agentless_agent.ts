/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import type { ElasticsearchClient, LogMeta, SavedObjectsClientContract } from '@kbn/core/server';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { AxiosError, AxiosRequestConfig } from 'axios';
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
    const withRequestIdMessage = (message: string) => `${message} [Request Id: ${traceId}]`;

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
    const errorMetadataWithRequestConfig: LogMeta = {
      ...errorMetadata,
      http: {
        request: {
          id: traceId,
          body: requestConfig.data,
        },
      },
    };

    const response = await axios<AgentlessApiResponse>(requestConfig).catch(
      (error: Error | AxiosError) => {
        if (!axios.isAxiosError(error)) {
          logger.error(
            `[Agentless API] Creating agentless failed with an error ${error} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AgentlessAgentCreateError(withRequestIdMessage(error.message));
        }

        const errorLogCodeCause = `${error.code}  ${this.convertCauseErrorsToString(error)}`;

        if (error.response) {
          // The request was made and the server responded with a status code and error data
          logger.error(
            `[Agentless API] Creating agentless failed because the Agentless API responding with a status code that falls out of the range of 2xx: ${JSON.stringify(
              error.response.status
            )}} ${JSON.stringify(error.response.data)}} ${requestConfigDebugStatus}`,
            {
              ...errorMetadataWithRequestConfig,
              http: {
                ...errorMetadataWithRequestConfig.http,
                response: {
                  status_code: error.response.status,
                  body: error.response.data,
                },
              },
            }
          );
          throw new AgentlessAgentCreateError(
            withRequestIdMessage(`the Agentless API could not create the agentless agent`)
          );
        } else if (error.request) {
          // The request was made but no response was received
          logger.error(
            `[Agentless API] Creating agentless agent failed while sending the request to the Agentless API: ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AgentlessAgentCreateError(
            withRequestIdMessage(`no response received from the Agentless API`)
          );
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.error(
            `[Agentless API] Creating agentless agent failed to be created ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AgentlessAgentCreateError(
            withRequestIdMessage('the Agentless API could not create the agentless agent')
          );
        }
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
      url: getDeletionEndpointPath(agentlessConfig, `/deployments/${agentlessPolicyId}`),
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
      const errorLogCodeCause = `${error.code} ${this.convertCauseErrorsToString(error)}`;

      if (!axios.isAxiosError(error)) {
        logger.error(
          `[Agentless API] Deleting agentless deployment failed with an error ${JSON.stringify(
            error
          )} ${requestConfigDebugStatus}`
        );
      }
      if (error.response) {
        logger.error(
          `[Agentless API] Deleting Agentless deployment Failed Response Error: ${JSON.stringify(
            error.response.status
          )}} ${JSON.stringify(error.response.data)}} ${requestConfigDebugStatus} `
        );
      } else if (error.request) {
        logger.error(
          `[Agentless API] Deleting agentless deployment failed to receive a response from the Agentless API ${errorLogCodeCause} ${requestConfigDebugStatus}`
        );
      } else {
        logger.error(
          `[Agentless API] Deleting agentless deployment failed to delete the request ${errorLogCodeCause} ${requestConfigDebugStatus}`
        );
      }
    });

    return response;
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
