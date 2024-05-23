/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentStatusClient } from './get_agent_status_client';
import { EndpointAgentStatusClient } from './endpoint/endpoint_agent_status_client';
import { SentinelOneAgentStatusClient } from './sentinel_one/sentinel_one_agent_status_client';
import { CrowdstrikeAgentStatusClient } from './crowdstrike/crowdstrike_agent_status_client';
import { UnsupportedAgentTypeError } from './errors';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { CrowdstrikeMock } from '../../actions/clients/crowdstrike/mocks';
import { responseActionsClientMock } from '../../actions/clients/mocks';

describe('getAgentStatusClient', () => {
  const mockedConstructorOptions = responseActionsClientMock.createConstructorOptions();
  const constructorOptions = {
    esClient: mockedConstructorOptions.esClient,
    soClient: savedObjectsClientMock.create(),
    connectorActionsClient: CrowdstrikeMock.createConnectorActionsClient(),
    endpointService: mockedConstructorOptions.endpointService,
  };

  it('returns an EndpointAgentStatusClient for endpoint agent type', () => {
    const client = getAgentStatusClient('endpoint', constructorOptions);
    expect(client).toBeInstanceOf(EndpointAgentStatusClient);
  });

  it('returns a SentinelOneAgentStatusClient for sentinel_one agent type', () => {
    const client = getAgentStatusClient('sentinel_one', constructorOptions);
    expect(client).toBeInstanceOf(SentinelOneAgentStatusClient);
  });

  it('returns a CrowdstrikeAgentStatusClient for crowdstrike agent type', () => {
    const client = getAgentStatusClient('crowdstrike', constructorOptions);
    expect(client).toBeInstanceOf(CrowdstrikeAgentStatusClient);
  });

  it('throws an UnsupportedAgentTypeError for unsupported agent type', () => {
    // @ts-expect-error testing unsupported agent type
    expect(() => getAgentStatusClient('unsupported_agent_type', constructorOptions)).toThrow(
      UnsupportedAgentTypeError
    );
  });
});
