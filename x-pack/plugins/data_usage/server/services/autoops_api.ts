/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import apm from 'elastic-apm-node';

import { Logger } from '@kbn/logging';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { LogMeta } from '@kbn/core/server';
import { parseToMoment } from '../../common/utils';
import {
  UsageMetricsAutoOpsResponseSchema,
  type UsageMetricsAutoOpsResponseSchemaBody,
  type UsageMetricsRequestBody,
} from '../../common/rest_types';
import { AutoOpsConfig } from '../types';
import { AutoOpsError } from './errors';
import { appContextService } from './app_context';

const AGENT_CREATION_FAILED_ERROR = 'AutoOps API could not create the autoops agent';
const AUTO_OPS_AGENT_CREATION_PREFIX = '[AutoOps API] Creating autoops agent failed';
const AUTO_OPS_MISSING_CONFIG_ERROR = 'Missing autoops configuration';

const getAutoOpsAPIRequestUrl = (url?: string, projectId?: string): string =>
  `${url}/monitoring/serverless/v1/projects/${projectId}/metrics`;

export class AutoOpsAPIService {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
  public async autoOpsUsageMetricsAPI(requestBody: UsageMetricsRequestBody) {
    const traceId = apm.currentTransaction?.traceparent;
    const withRequestIdMessage = (message: string) => `${message} [Request Id: ${traceId}]`;

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const autoopsConfig = appContextService.getConfig()?.autoops;
    if (!autoopsConfig) {
      this.logger.error(`[AutoOps API] ${AUTO_OPS_MISSING_CONFIG_ERROR}`, errorMetadata);
      throw new AutoOpsError(AUTO_OPS_MISSING_CONFIG_ERROR);
    }

    if (!autoopsConfig.api?.url) {
      this.logger.error(`[AutoOps API] Missing API URL in the configuration.`, errorMetadata);
      throw new AutoOpsError('Missing API URL in AutoOps configuration.');
    }

    if (!autoopsConfig.api?.tls?.certificate || !autoopsConfig.api?.tls?.key) {
      this.logger.error(
        `[AutoOps API] Missing required TLS certificate or key in the configuration.`,
        errorMetadata
      );
      throw new AutoOpsError('Missing required TLS certificate or key in AutoOps configuration.');
    }

    this.logger.debug(
      `[AutoOps API] Creating autoops agent with request URL: ${autoopsConfig.api.url} and TLS cert: [REDACTED] and TLS key: [REDACTED]`
    );

    const controller = new AbortController();
    const tlsConfig = this.createTlsConfig(autoopsConfig);
    const cloudSetup = appContextService.getCloud();

    const requestConfig: AxiosRequestConfig = {
      url: getAutoOpsAPIRequestUrl(autoopsConfig.api?.url, cloudSetup?.serverless.projectId),
      data: {
        from: parseToMoment(requestBody.from)?.toISOString(),
        to: parseToMoment(requestBody.to)?.toISOString(),
        size: requestBody.dataStreams.length,
        level: 'datastream',
        metric_types: requestBody.metricTypes,
        allowed_indices: requestBody.dataStreams,
      },
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-Request-ID': traceId,
        traceparent: traceId,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      }),
    };

    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    this.logger.debug(
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
          this.logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} with an error ${error} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(error.message));
        }

        const errorLogCodeCause = `${error.code}  ${this.convertCauseErrorsToString(error)}`;

        if (error.response) {
          // The request was made and the server responded with a status code and error data
          this.logger.error(
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
          this.logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} while sending the request to the AutoOps API: ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new Error(withRequestIdMessage(`no response received from the AutoOps API`));
        } else {
          // Something happened in setting up the request that triggered an Error
          this.logger.error(
            `${AUTO_OPS_AGENT_CREATION_PREFIX} to be created ${errorLogCodeCause} ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AutoOpsError(withRequestIdMessage(AGENT_CREATION_FAILED_ERROR));
        }
      }
    );

    const validatedResponse = UsageMetricsAutoOpsResponseSchema.body().validate(response.data);

    this.logger.debug(`[AutoOps API] Successfully created an autoops agent ${response}`);
    return validatedResponse;
  }

  private createTlsConfig(autoopsConfig: AutoOpsConfig | undefined) {
    return new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: autoopsConfig?.api?.tls?.certificate,
        key: autoopsConfig?.api?.tls?.key,
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
