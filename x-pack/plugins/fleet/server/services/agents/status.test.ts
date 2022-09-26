/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { AGENT_POLLING_THRESHOLD_MS } from '../../../common/constants';

import { getAgentStatusById } from './status';

describe('Agent status service', () => {
  it('should return inactive when agent is not active', async () => {
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockElasticsearchClient.get.mockResponse(
      // @ts-expect-error not full interface
      {
        _id: 'id',
        _source: {
          active: false,
          local_metadata: {},
          user_provided_metadata: {},
        },
      }
    );
    const status = await getAgentStatusById(mockElasticsearchClient, 'id');
    expect(status).toEqual('inactive');
  });

  it('should return online when agent is active', async () => {
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockElasticsearchClient.get.mockResponse(
      // @ts-expect-error not full interface
      {
        _id: 'id',
        _source: {
          active: true,
          policy_revision_idx: 1,
          last_checkin: new Date().toISOString(),
          local_metadata: {},
          user_provided_metadata: {},
        },
      }
    );
    const status = await getAgentStatusById(mockElasticsearchClient, 'id');
    expect(status).toEqual('online');
  });

  it('should return enrolling when agent is active but never checkin', async () => {
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockElasticsearchClient.get.mockResponse(
      // @ts-expect-error not full interface
      {
        _id: 'id',
        _source: {
          active: true,
          local_metadata: {},
          user_provided_metadata: {},
        },
      }
    );
    const status = await getAgentStatusById(mockElasticsearchClient, 'id');
    expect(status).toEqual('enrolling');
  });

  it('should return unenrolling when agent is unenrolling', async () => {
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockElasticsearchClient.get.mockResponse(
      // @ts-expect-error not full interface
      {
        _id: 'id',
        _source: {
          active: true,
          last_checkin: new Date().toISOString(),
          unenrollment_started_at: new Date().toISOString(),
          local_metadata: {},
          user_provided_metadata: {},
        },
      }
    );
    const status = await getAgentStatusById(mockElasticsearchClient, 'id');
    expect(status).toEqual('unenrolling');
  });

  it('should return offline when agent has not checked in for 10 intervals', async () => {
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockElasticsearchClient.get.mockResponse(
      // @ts-expect-error not full interface
      {
        _id: 'id',
        _source: {
          active: true,
          last_checkin: new Date(Date.now() - 10 * AGENT_POLLING_THRESHOLD_MS - 1000).toISOString(),
          policy_revision_idx: 2,
          local_metadata: {},
          user_provided_metadata: {},
        },
      }
    );
    const status = await getAgentStatusById(mockElasticsearchClient, 'id');
    expect(status).toEqual('offline');
  });
});
