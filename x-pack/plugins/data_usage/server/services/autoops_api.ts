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
import { UsageMetricsResponseSchemaBody } from '../../common/rest_types';
import { appContextService } from '../app_context';
import { AutoOpsConfig } from '../types';

class AutoOpsAPIService {
  public async autoOpsUsageMetricsAPI(requestBody: UsageMetricsResponseSchemaBody) {
    const logger = appContextService.getLogger().get();
    const traceId = apm.currentTransaction?.traceparent;
    const withRequestIdMessage = (message: string) => `${message} [Request Id: ${traceId}]`;

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const autoopsConfig = appContextService.getConfig()?.autoops;
    if (!autoopsConfig) {
      logger.error('[AutoOps API] Missing autoops configuration', errorMetadata);
      throw new Error('missing autoops configuration');
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

    const cloudSetup = appContextService.getCloud();
    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
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

    const response = await axios<UsageMetricsResponseSchemaBody>(requestConfig).catch(
      (error: Error | AxiosError) => {
        if (!axios.isAxiosError(error)) {
          logger.error(
            `[AutoOps API] Creating autoops failed with an error ${error} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(error.message));
        }

        const errorLogCodeCause = `${error.code}  ${this.convertCauseErrorsToString(error)}`;

        if (error.response) {
          // The request was made and the server responded with a status code and error data
          logger.error(
            `[AutoOps API] Creating autoops failed because the AutoOps API responding with a status code that falls out of the range of 2xx: ${JSON.stringify(
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
          throw new Error(
            withRequestIdMessage(`the AutoOps API could not create the autoops agent`)
          );
        } else if (error.request) {
          // The request was made but no response was received
          logger.error(
            `[AutoOps API] Creating autoops agent failed while sending the request to the AutoOps API: ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(`no response received from the AutoOps API`));
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.error(
            `[AutoOps API] Creating autoops agent failed to be created ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(
            withRequestIdMessage('the AutoOps API could not create the autoops agent')
          );
        }
      }
    );

    logger.debug(`[AutoOps API] Created an autoops agent ${response}`);
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

export const autoopsApiService = new AutoOpsAPIService();
