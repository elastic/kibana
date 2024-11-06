/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import apm from 'elastic-apm-node';

import type { AxiosError, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { LogMeta } from '@kbn/core/server';
import {
  UsageMetricsAutoOpsResponseSchemaBody,
  UsageMetricsRequestBody,
} from '../../common/rest_types';
import { AppContextService } from './app_context';
import { AutoOpsConfig } from '../types';
import { AutoOpsError } from './errors';

const AGENT_CREATION_FAILED_ERROR = 'AutoOps API could not create the autoops agent';
const AUTO_OPS_AGENT_CREATION_PREFIX = '[AutoOps API] Creating autoops agent failed';
const AUTO_OPS_MISSING_CONFIG_ERROR = 'Missing autoops configuration';
export class AutoOpsAPIService {
  constructor(private appContextService: AppContextService) {}
  public async autoOpsUsageMetricsAPI(requestBody: UsageMetricsRequestBody) {
    const logger = this.appContextService.getLogger().get();
    const traceId = apm.currentTransaction?.traceparent;
    const withRequestIdMessage = (message: string) => `${message} [Request Id: ${traceId}]`;

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const autoopsConfig = this.appContextService.getConfig()?.autoops;
    if (!autoopsConfig) {
      logger.error(`[AutoOps API] ${AUTO_OPS_MISSING_CONFIG_ERROR}`, errorMetadata);
      throw new AutoOpsError(AUTO_OPS_MISSING_CONFIG_ERROR);
    }

    logger.debug(
      `[AutoOps API] Creating autoops agent with TLS cert: ${
        autoopsConfig?.api?.tls?.certificate ? '[REDACTED]' : 'undefined'
      } and TLS key: ${autoopsConfig?.api?.tls?.key ? '[REDACTED]' : 'undefined'}
      and TLS ca: ${autoopsConfig?.api?.tls?.ca ? '[REDACTED]' : 'undefined'}`
    );
    const tlsConfig = this.createTlsConfig(autoopsConfig);

    const requestConfig: AxiosRequestConfig = {
      url: autoopsConfig.api?.url,
      data: requestBody,
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

    const cloudSetup = this.appContextService.getCloud();
    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = this.appContextService.getKibanaVersion();
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[AutoOps API] Creating autoops agent with request config ${requestConfigDebugStatus}`
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

    const response = await axios<UsageMetricsAutoOpsResponseSchemaBody>(requestConfig).catch(
      (error: Error | AxiosError) => {
        if (!axios.isAxiosError(error)) {
          logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} with an error ${error} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(error.message));
        }

        const errorLogCodeCause = `${error.code}  ${this.convertCauseErrorsToString(error)}`;

        if (error.response) {
          // The request was made and the server responded with a status code and error data
          logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} because the AutoOps API responded with a status code that falls out of the range of 2xx: ${JSON.stringify(
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
          throw new AutoOpsError(withRequestIdMessage(AGENT_CREATION_FAILED_ERROR));
        } else if (error.request) {
          // The request was made but no response was received
          logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} while sending the request to the AutoOps API: ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(`no response received from the AutoOps API`));
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} to be created ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AutoOpsError(withRequestIdMessage(AGENT_CREATION_FAILED_ERROR));
        }
      }
    );

    logger.debug(`[AutoOps API] Successfully created an autoops agent ${response}`);
    return response;
  }

  private createTlsConfig(autoopsConfig: AutoOpsConfig | undefined) {
    return new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: autoopsConfig?.api?.tls?.certificate,
        key: autoopsConfig?.api?.tls?.key,
        certificateAuthorities: autoopsConfig?.api?.tls?.ca,
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
}
