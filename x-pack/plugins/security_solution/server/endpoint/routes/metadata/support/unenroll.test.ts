/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import {
  findAllUnenrolledHostIds,
  fetchAllUnenrolledHostIdsWithScroll,
  HostId,
  findUnenrolledHostByHostId,
} from './unenroll';
import { elasticsearchServiceMock } from '../../../../../../../../src/core/server/mocks';
import { SearchResponse } from 'elasticsearch';
import { metadataMirrorIndexPattern } from '../../../../../common/endpoint/constants';
import { EndpointStatus } from '../../../../../common/endpoint/types';

const noUnenrolledEndpoint = () =>
  Promise.resolve(({
    hits: {
      hits: [],
    },
  } as unknown) as SearchResponse<HostId>);

describe('test find all unenrolled HostId', () => {
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;

  it('can find all hits with scroll', async () => {
    const firstHostId = '1fdca33f-799f-49f4-939c-ea4383c77671';
    const secondHostId = '2fdca33f-799f-49f4-939c-ea4383c77672';
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockScopedClient.callAsCurrentUser
      .mockImplementationOnce(() => Promise.resolve(createSearchResponse(secondHostId, 'scrollId')))
      .mockImplementationOnce(noUnenrolledEndpoint);

    const initialResponse = createSearchResponse(firstHostId, 'initialScrollId');
    const hostIds = await fetchAllUnenrolledHostIdsWithScroll(
      initialResponse,
      mockScopedClient.callAsCurrentUser
    );

    expect(hostIds).toEqual([{ host: { id: firstHostId } }, { host: { id: secondHostId } }]);
  });

  it('can find all unerolled endpoint host ids', async () => {
    const firstEndpointHostId = '1fdca33f-799f-49f4-939c-ea4383c77671';
    const secondEndpointHostId = '2fdca33f-799f-49f4-939c-ea4383c77672';
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockScopedClient.callAsCurrentUser
      .mockImplementationOnce(() =>
        Promise.resolve(createSearchResponse(firstEndpointHostId, 'initialScrollId'))
      )
      .mockImplementationOnce(() =>
        Promise.resolve(createSearchResponse(secondEndpointHostId, 'scrollId'))
      )
      .mockImplementationOnce(noUnenrolledEndpoint);
    const hostIds = await findAllUnenrolledHostIds(mockScopedClient);

    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]).toEqual({
      index: metadataMirrorIndexPattern,
      scroll: '30s',
      body: {
        size: 1000,
        _source: ['host.id'],
        query: {
          bool: {
            filter: {
              term: {
                'Endpoint.status': EndpointStatus.unenrolled,
              },
            },
          },
        },
      },
    });
    expect(hostIds).toEqual([
      { host: { id: firstEndpointHostId } },
      { host: { id: secondEndpointHostId } },
    ]);
  });
});

describe('test find unenrolled endpoint host id by hostId', () => {
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;

  it('can find unenrolled endpoint by the host id when unenrolled', async () => {
    const firstEndpointHostId = '1fdca33f-799f-49f4-939c-ea4383c77671';
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve(createSearchResponse(firstEndpointHostId, 'initialScrollId'))
    );
    const endpointHostId = await findUnenrolledHostByHostId(mockScopedClient, firstEndpointHostId);
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]?.index).toEqual(
      metadataMirrorIndexPattern
    );
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][1]?.body).toEqual({
      size: 1,
      _source: ['host.id'],
      query: {
        bool: {
          filter: [
            {
              term: {
                'Endpoint.status': EndpointStatus.unenrolled,
              },
            },
            {
              term: {
                'host.id': firstEndpointHostId,
              },
            },
          ],
        },
      },
    });
    expect(endpointHostId).toEqual({ host: { id: firstEndpointHostId } });
  });

  it('find unenrolled endpoint host by the host id return undefined when no unenrolled host', async () => {
    const firstHostId = '1fdca33f-799f-49f4-939c-ea4383c77671';
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(noUnenrolledEndpoint);
    const hostId = await findUnenrolledHostByHostId(mockScopedClient, firstHostId);
    expect(hostId).toBeFalsy();
  });
});

function createSearchResponse(hostId: string, scrollId: string): SearchResponse<HostId> {
  return ({
    hits: {
      hits: [
        {
          _index: metadataMirrorIndexPattern,
          _id: 'S5M1yHIBLSMVtiLw6Wpr',
          _score: 0.0,
          _source: {
            host: {
              id: hostId,
            },
          },
        },
      ],
    },
    _scroll_id: scrollId,
  } as unknown) as SearchResponse<HostId>;
}
