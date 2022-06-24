/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { URL } from 'url';

import type { TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SearchHit, ESSearchResponse } from '@kbn/core/types/elasticsearch';

import type {
  Artifact,
  ArtifactElasticsearchProperties,
  ArtifactsClientInterface,
  NewArtifact,
} from './types';
import { newArtifactToElasticsearchProperties } from './mappings';

export const createArtifactsClientMock = (): jest.Mocked<ArtifactsClientInterface> => {
  return {
    getArtifact: jest.fn().mockResolvedValue(generateArtifactMock()),
    createArtifact: jest.fn().mockResolvedValue(generateArtifactMock()),
    deleteArtifact: jest.fn(),
    listArtifacts: jest.fn().mockResolvedValue({
      items: [generateArtifactMock()],
      total: 1,
      perPage: 20,
      page: 1,
    }),
    generateHash: jest
      .fn()
      .mockResolvedValue('e40a028b3dab7e567135b80ed69934a52be5b4c2d901faa8e0997b256c222473'),
    encodeContent: jest.fn().mockResolvedValue({
      body: 'eJyrVspOrVSyUlAqS8wpTVWqBQArrwVB',
      compressionAlgorithm: 'zlib',
      decodedSha256: '9724c1e20e6e3e4d7f57ed25f9d4efb006e508590d528c90da597f6a775c13e5',
      decodedSize: 16,
      encodedSha256: '446086d1609189c3ad93a943976e4b7474c028612e5ec4810a81cc01a631f0f9',
      encodedSize: 24,
    }),
  };
};

export const generateArtifactMock = (): Artifact => {
  return {
    id: '123',
    type: 'trustlist',
    identifier: 'trustlist-v1',
    packageName: 'endpoint',
    encryptionAlgorithm: 'none',
    relative_url: '/api/fleet/artifacts/trustlist-v1/d801aa1fb',
    compressionAlgorithm: 'zlib',
    decodedSha256: 'd801aa1fb',
    decodedSize: 14,
    encodedSha256: 'd29238d40',
    encodedSize: 22,
    body: 'eJyrVkrNKynKTC1WsoqOrQUAJxkFKQ==',
    created: '2021-03-08T14:47:13.714Z',
  };
};

export interface GenerateEsRequestErrorApiResponseMockProps {
  statusCode?: number;
}

export const generateEsRequestErrorApiResponseMock = (
  { statusCode = 500 }: GenerateEsRequestErrorApiResponseMockProps = { statusCode: 500 }
): TransportResult => {
  return generateEsApiResponseMock(
    {
      _index: '.fleet-artifacts_1',
      _id: '123',
      found: false,
    },
    {
      statusCode,
    }
  );
};

export const generateArtifactEsGetSingleHitMock = (
  artifact?: NewArtifact
): SearchHit<ArtifactElasticsearchProperties> => {
  const { id, created, ...newArtifact } = generateArtifactMock();
  const _source = {
    ...newArtifactToElasticsearchProperties(artifact ?? newArtifact),
    created,
  };

  return {
    _index: '.fleet-artifacts_1',
    _id: id,
    _version: 1,
    _score: 1,
    _source,
  };
};

export const generateArtifactEsSearchResultHitsMock = (): ESSearchResponse<
  ArtifactElasticsearchProperties,
  {},
  { restTotalHitsAsInt: true }
> => {
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 1,
      max_score: 2,
      hits: [generateArtifactEsGetSingleHitMock()],
    },
  };
};

export const generateEsApiResponseMock = <TBody extends Record<string, any>>(
  body: TBody,
  otherProps: Partial<Exclude<TransportResult, 'body'>> = {}
): TransportResult => {
  return elasticsearchServiceMock.createApiResponse({
    body,
    headers: {
      'content-type': 'application/json',
      'content-length': '697',
    },
    meta: {
      context: null,
      request: {
        params: {
          method: 'GET',
          path: '/.fleet-artifacts/_doc/02d38f4b-24cf-486e-b17e-9f727cfde23c',
          body: undefined,
          querystring: '',
        },
        options: {},
        id: 7160,
      },
      name: 'elasticsearch-js',
      connection: {
        url: new URL('http://localhost:9200/'),
        id: 'http://localhost:9200/',
        headers: {},
        deadCount: 0,
        resurrectTimeout: 0,
        _openRequests: 0,
        status: 'alive',
        // There are some properties missing below which is not important for this mock
        // @ts-expect-error
        roles: {
          master: true,
          data: true,
          ingest: true,
          ml: false,
        },
      },
      attempts: 0,
      aborted: false,
    },
    ...otherProps,
  });
};

type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createInternalClient>;
type EsClientMockMethods = keyof Pick<EsClientMock, 'get' | 'create' | 'delete' | 'search'>;

export const setEsClientMethodResponseToError = (
  esClientMock: EsClientMock,
  method: EsClientMockMethods,
  options?: GenerateEsRequestErrorApiResponseMockProps
) => {
  esClientMock[method].mockImplementation(() => {
    return elasticsearchServiceMock.createErrorTransportRequestPromise(
      new errors.ResponseError(generateEsRequestErrorApiResponseMock(options))
    );
  });
};
