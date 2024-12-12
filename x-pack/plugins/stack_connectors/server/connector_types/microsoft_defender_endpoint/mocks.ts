/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { createAxiosResponseMock } from '../lib/mocks';
import { MicrosoftDefenderEndpointConnector } from './microsoft_defender_endpoint';

class MicrosoftDefenderEndpointConnectorTestClass extends MicrosoftDefenderEndpointConnector {
  public mockResponses = {};

  public requestSpy = jest.fn(async ({ url }: SubActionRequestParams<any>) => {
    const response = createAxiosResponseMock({});

    // Mocks some of the MS API responses
    if (url.endsWith('/agents')) {
      // TODO:PT implement
    }

    return response;
  });
}

const createMicrosoftDefenderTestInstance = () => {
  //
};

export const microsoftDefenderEndpointConnectorMocks = Object.freeze({
  create: createMicrosoftDefenderTestInstance,
  createAxiosResponseMock,
});
