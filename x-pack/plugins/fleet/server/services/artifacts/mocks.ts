/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { URL } from 'url';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { ApiResponse } from '@elastic/elasticsearch';
import { ESSearchHit } from '../../../../../typings/elasticsearch';
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

export const generateEsRequestErrorApiResponseMock = (
  { statusCode }: { statusCode: number } = { statusCode: 500 }
): ApiResponse => {
  return {
    body: {
      _index: '.fleet-artifacts_1',
      _id: '123',
      found: false,
    },
    statusCode,
    headers: {
      'content-type': 'application/json',
      'content-length': '57',
    },
    meta: {
      context: null,
      request: {
        params: {
          method: 'GET',
          path: '/.fleet-artifacts/_doc/123',
          body: undefined,
          querystring: '',
        },
        options: {},
        id: 64,
      },
      name: 'elasticsearch-js',
      // We don't need a full connection object
      // @ts-ignore
      connection: {
        url: new URL('http://localhost:9200/'),
        id: 'http://localhost:9200/',
        headers: {},
        deadCount: 0,
        resurrectTimeout: 0,
        _openRequests: 2,
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
  };
};

export const generateArtifactEsSearchHitMock = (): ESSearchHit<ArtifactElasticsearchProperties> => {
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

/**
 * Generate a response from the elasticsearch client for a single hit
 * @param body
 */
export const generateESClientSearchHitResponse = (
  body: ESSearchHit<ArtifactElasticsearchProperties>
): RequestEvent<ESSearchHit<ArtifactElasticsearchProperties>> => {
  return {
    body,
    statusCode: 200,
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
  };
};
