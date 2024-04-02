/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponseActionsClientConstructorOptions } from '../..';
import { responseActionsClientMock } from './mocks';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../common/endpoint/service/response_actions/constants';
import { getResponseActionsClient } from '../..';
import { ResponseActionsClientImpl } from './lib/base_response_actions_client';
import { UnsupportedResponseActionsAgentTypeError } from './errors';
import { sentinelOneMock } from './sentinelone/mocks';

describe('getResponseActionsClient()', () => {
  let options: GetResponseActionsClientConstructorOptions;

  beforeEach(() => {
    options = {
      ...responseActionsClientMock.createConstructorOptions(),
      connectorActions: sentinelOneMock.createConnectorActionsClient(),
    };
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should return a response actions client for agentType: %s',
    (agentType) => {
      expect(getResponseActionsClient(agentType, options)).toBeInstanceOf(
        ResponseActionsClientImpl
      );
    }
  );

  it(`should throw error if agentType is not supported`, () => {
    expect(() => getResponseActionsClient('foo', options)).toThrow(
      UnsupportedResponseActionsAgentTypeError
    );
  });
});
