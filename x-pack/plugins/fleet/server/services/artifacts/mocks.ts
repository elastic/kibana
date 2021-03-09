/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { URL } from 'url';
import { ApiResponse } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { ESSearchHit, ESSearchResponse } from '../../../../../typings/elasticsearch';
import { Artifact, ArtifactElasticsearchProperties } from './types';

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
): ApiResponse => {
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

export const generateArtifactEsGetSingleHitMock = (): ESSearchHit<ArtifactElasticsearchProperties> => {
  const { id, ..._source } = generateArtifactMock();

  return {
    _index: '.fleet-artifacts_1',
    _id: id,
    _version: 1,
    _type: '',
    _score: 1,
    _source,
  };
};

export const generateArtifactEsSearchResultHitsMock = (): ESSearchResponse<
  ArtifactElasticsearchProperties,
  {}
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
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 2,
      hits: [generateArtifactEsGetSingleHitMock()],
    },
  };
};

export const generateEsApiResponseMock = <TBody extends Record<string, any>>(
  body: TBody,
  otherProps: Partial<Exclude<ApiResponse, 'body'>> = {}
): ApiResponse => {
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
      // There are some properties missing below which is not important for this mock
      // @ts-ignore
      connection: {
        url: new URL('http://localhost:9200/'),
        id: 'http://localhost:9200/',
        headers: {},
        deadCount: 0,
        resurrectTimeout: 0,
        _openRequests: 0,
        status: 'alive',
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
