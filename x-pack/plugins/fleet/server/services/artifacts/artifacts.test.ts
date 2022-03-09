/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';

import { errors } from '@elastic/elasticsearch';

import type { TransportResult } from '@elastic/elasticsearch';

import { FLEET_SERVER_ARTIFACTS_INDEX } from '../../../common';

import { ArtifactsElasticsearchError } from '../../errors';

import {
  generateArtifactEsGetSingleHitMock,
  generateArtifactEsSearchResultHitsMock,
  generateArtifactMock,
  generateEsRequestErrorApiResponseMock,
  setEsClientMethodResponseToError,
} from './mocks';
import {
  createArtifact,
  deleteArtifact,
  encodeArtifactContent,
  generateArtifactContentHash,
  getArtifact,
  listArtifacts,
} from './artifacts';

import type { NewArtifact } from './types';
import { newArtifactToElasticsearchProperties } from './mappings';

describe('When using the artifacts services', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createInternalClient();
  });

  describe('and calling `getArtifact()`', () => {
    it('should get artifact using id', async () => {
      // @ts-expect-error not full interface
      esClientMock.get.mockResponse(generateArtifactEsGetSingleHitMock());

      expect(await getArtifact(esClientMock, '123')).toEqual(generateArtifactMock());
      expect(esClientMock.get).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id: '123',
      });
    });

    it('should return undefined if artifact is not found', async () => {
      setEsClientMethodResponseToError(esClientMock, 'get', { statusCode: 404 });
      expect(await getArtifact(esClientMock, '123')).toBeUndefined();
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      esClientMock.get.mockImplementation(() => {
        return elasticsearchServiceMock.createErrorTransportRequestPromise(
          new errors.ResponseError(generateEsRequestErrorApiResponseMock())
        );
      });

      await expect(getArtifact(esClientMock, '123')).rejects.toBeInstanceOf(
        ArtifactsElasticsearchError
      );
    });
  });

  describe('and calling `createArtifact()`', () => {
    let newArtifact: NewArtifact;

    beforeEach(() => {
      const { id, created, ...artifact } = generateArtifactMock();
      newArtifact = artifact;
    });

    it('should create and return artifact', async () => {
      const artifact = await createArtifact(esClientMock, newArtifact);

      expect(esClientMock.create).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id: `${artifact.packageName}:${artifact.identifier}-${artifact.decodedSha256}`,
        body: {
          ...newArtifactToElasticsearchProperties(newArtifact),
          created: expect.any(String),
        },
        refresh: 'wait_for',
      });

      expect(artifact).toEqual({
        ...newArtifact,
        id: expect.any(String),
        created: expect.any(String),
      });
    });

    it('should ignore 409 errors from elasticsearch', async () => {
      const error = new errors.ResponseError({ statusCode: 409 } as TransportResult);
      // Unclear why `mockRejectedValue()` has the params value type set to `never`
      esClientMock.create.mockRejectedValue(error);
      await expect(() => createArtifact(esClientMock, newArtifact)).not.toThrow();
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      setEsClientMethodResponseToError(esClientMock, 'create');
      await expect(createArtifact(esClientMock, newArtifact)).rejects.toBeInstanceOf(
        ArtifactsElasticsearchError
      );
    });
  });

  describe('and calling `deleteArtifact()`', () => {
    it('should delete the artifact', async () => {
      deleteArtifact(esClientMock, '123');

      expect(esClientMock.delete).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id: '123',
        refresh: 'wait_for',
      });
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      setEsClientMethodResponseToError(esClientMock, 'delete');

      await expect(deleteArtifact(esClientMock, '123')).rejects.toBeInstanceOf(
        ArtifactsElasticsearchError
      );
    });
  });

  describe('and calling `listArtifacts()`', () => {
    beforeEach(() => {
      esClientMock.search.mockResponse(generateArtifactEsSearchResultHitsMock());
    });

    it('should use defaults when options is not provided', async () => {
      const results = await listArtifacts(esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        ignore_unavailable: true,
        q: '',
        from: 0,
        size: 20,
        track_total_hits: true,
        rest_total_hits_as_int: true,
        body: {
          sort: [{ created: { order: 'asc' } }],
        },
      });

      expect(results).toEqual({
        items: [
          {
            ...generateArtifactMock(),
            id: expect.any(String),
            created: expect.any(String),
          },
        ],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should allow for options to be defined', async () => {
      const { items, ...listMeta } = await listArtifacts(esClientMock, {
        perPage: 50,
        page: 10,
        kuery: 'packageName:endpoint',
        sortField: 'identifier',
        sortOrder: 'desc',
      });

      expect(esClientMock.search).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        q: 'packageName:endpoint',
        ignore_unavailable: true,
        from: 450,
        size: 50,
        track_total_hits: true,
        rest_total_hits_as_int: true,
        body: {
          sort: [{ identifier: { order: 'desc' } }],
        },
      });

      expect(listMeta).toEqual({
        perPage: 50,
        page: 10,
        total: 1,
      });
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      setEsClientMethodResponseToError(esClientMock, 'search');

      await expect(listArtifacts(esClientMock)).rejects.toBeInstanceOf(ArtifactsElasticsearchError);
    });
  });

  describe('and calling `generateArtifactContentHash()`', () => {
    it('should return a sha256 string', () => {
      expect(generateArtifactContentHash('eJyrVkrNKynKTC1WsoqOrQUAJxkFKQ==')).toBe(
        'e40a028b3dab7e567135b80ed69934a52be5b4c2d901faa8e0997b256c222473'
      );
    });
  });

  describe('and calling `encodeArtifactContent()`', () => {
    it('should encode content', async () => {
      expect(await encodeArtifactContent('{"key": "value"}')).toEqual({
        body: 'eJyrVspOrVSyUlAqS8wpTVWqBQArrwVB',
        compressionAlgorithm: 'zlib',
        decodedSha256: '9724c1e20e6e3e4d7f57ed25f9d4efb006e508590d528c90da597f6a775c13e5',
        decodedSize: 16,
        encodedSha256: 'b411ccf0a7bf4e015d849ee82e3512683d72c5a3c9bd233db9c885b229b8adf4',
        encodedSize: 24,
      });
    });
  });
});
