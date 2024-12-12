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
import { OAuthTokenManager } from './o_auth_token_manager';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from '../../../common/microsoft_defender_endpoint/constants';
import {
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  TestConnectorParamsSchema,
  MicrosoftDefenderEndpointDoNotValidateResponseSchema,
} from '../../../common/microsoft_defender_endpoint/schema';
import {
  MicrosoftDefenderEndpointAgentDetailsParams,
  MicrosoftDefenderEndpointIsolateHostParams,
  MicrosoftDefenderEndpointBaseApiResponse,
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
  MicrosoftDefenderEndpointReleaseHostParams,
  MicrosoftDefenderEndpointTestConnectorParams,
  MicrosoftDefenderEndpointAgentDetails,
} from '../../../common/microsoft_defender_endpoint/types';

export const API_MAX_RESULTS = 1000;

export class MicrosoftDefenderEndpointConnector extends SubActionConnector<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> {
  private readonly oAuthToken: OAuthTokenManager;

  private readonly urls: {
    machines: string;
    isolateHost: string;
    releaseHost: string;
  };

  constructor(
    params: ServiceParams<MicrosoftDefenderEndpointConfig, MicrosoftDefenderEndpointSecrets>
  ) {
    super(params);

    this.oAuthToken = new OAuthTokenManager({ ...params, apiRequest: this.request.bind(this) });

    this.urls = {
      machines: `${this.config.apiUrl}/api/machines`,
      isolateHost: `${this.config.apiUrl}/....`, // TODO:PT implememnt
      releaseHost: `${this.config.apiUrl}/....`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR,
      method: 'getAgentDetails',
      schema: TestConnectorParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST,
      method: 'isolateHost',
      schema: IsolateHostParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST,
      method: 'releaseHost',
      schema: ReleaseHostParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR,
      method: 'testConnector',
      schema: TestConnectorParamsSchema,
    });
  }

  private async fetchFromMicrosoft<R extends MicrosoftDefenderEndpointBaseApiResponse>(
    req: Omit<SubActionRequestParams<R>, 'responseSchema'>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<R> {
    const bearerAccessToken = await this.oAuthToken.get(connectorUsageCollector);
    const response = await this.request<R>(
      {
        ...req,
        // We don't validate responses from Microsoft API's because we do not want failures for cases
        // where the external system might add/remove/change values in the response that we have no
        // control over.
        responseSchema:
          MicrosoftDefenderEndpointDoNotValidateResponseSchema as unknown as SubActionRequestParams<R>['responseSchema'],
        headers: { Authorization: `Bearer ${bearerAccessToken}` },
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

  public async testConnector(
    options: MicrosoftDefenderEndpointTestConnectorParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<void> {
    await this.getAgentDetails({ id: 'foo' }, connectorUsageCollector);
  }

  public async getAgentDetails(
    { id }: MicrosoftDefenderEndpointAgentDetailsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointAgentDetails> {
    return this.fetchFromMicrosoft({ url: `${this.urls.machines}/${id}` }, connectorUsageCollector);
  }

  public async isolateHost(
    options: MicrosoftDefenderEndpointIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    throw new Error('Not implemented (yet)');
  }

  public async releaseHost(
    options: MicrosoftDefenderEndpointReleaseHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    throw new Error('Not implemented (yet)');
  }
}
