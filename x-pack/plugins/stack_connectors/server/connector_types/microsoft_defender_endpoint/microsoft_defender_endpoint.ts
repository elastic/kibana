/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import {
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  MicrosoftDefenderEndpointBaseApiResponseSchema,
} from '../../../common/microsoft_defender_endpoint/schema';
import {
  MicrosoftDefenderEndpointBaseApiResponse,
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
} from '../../../common/microsoft_defender_endpoint/types';
import type { SentinelOneIsolateHostParams } from '../../../common/sentinelone/types';
import { SUB_ACTION } from '../../../common/sentinelone/constants';

export const API_MAX_RESULTS = 1000;
export const API_PATH = '/web/api/v2.1';

export class MicrosoftDefenderEndpointConnector extends SubActionConnector<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> {
  private urls: {
    isolateHost: string;
    releaseHost: string;
  };

  constructor(
    params: ServiceParams<MicrosoftDefenderEndpointConfig, MicrosoftDefenderEndpointSecrets>
  ) {
    super(params);

    this.urls = {
      isolateHost: `${this.config.url}${API_PATH}/some/path/here`, // FIXME:PT implement once its known
      releaseHost: `${this.config.url}${API_PATH}/some/path/here`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.ISOLATE_HOST,
      method: 'isolateHost',
      schema: IsolateHostParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RELEASE_HOST,
      method: 'releaseHost',
      schema: ReleaseHostParamsSchema,
    });
  }

  private async fetch<R extends MicrosoftDefenderEndpointBaseApiResponse>(
    req: SubActionRequestParams<R>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<R> {
    const response = await this.request<R>(
      {
        ...req,
        // We don't validate responses from Microsoft API's because we do not want failures for cases
        // where the external system might add/remove/change values in the response that we have no
        // control over.
        responseSchema:
          MicrosoftDefenderEndpointBaseApiResponseSchema as unknown as SubActionRequestParams<R>['responseSchema'],
        params: {
          ...req.params,
          // APIToken: this.secrets.token, // TODO: inject API token once we know where that goes
        },
      },
      connectorUsageCollector
    );

    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    const appendResponseBody = (message: string): string => {
      const responseBody = JSON.stringify(error.response?.data ?? {});

      if (responseBody) {
        return `${message}\nResponse body: ${responseBody}`;
      }

      return message;
    };

    if (!error.response?.status) {
      return appendResponseBody(error.message ?? 'Unknown API Error');
    }

    if (error.response.status === 401) {
      return appendResponseBody('Unauthorized API Error (401)');
    }

    return appendResponseBody(`API Error: [${error.response?.statusText}] ${error.message}`);
  }

  public async isolateHost(
    { alertIds, ...payload }: SentinelOneIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    throw new Error('Not implemented (yet)');
  }

  public async releaseHost(
    { alertIds, ...payload }: SentinelOneIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    throw new Error('Not implemented (yet)');
  }
}
