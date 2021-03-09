/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import {
  generateArtifactEsSearchHitMock,
  generateArtifactMock,
  generateEsRequestErrorApiResponseMock,
  GenerateEsRequestErrorApiResponseMockProps,
} from './mocks';
import { createArtifact, deleteArtifact, getArtifact } from './artifacts';
import { FLEET_SERVER_ARTIFACTS_INDEX } from '../../../common';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { ArtifactsElasticsearchError } from './errors';
import { NewArtifact } from './types';

describe('When using the artifacts services', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  const setEsClientMethodResponseToError = (
    method: keyof Pick<typeof esClientMock, 'get' | 'create' | 'delete' | 'search'>,
    options?: GenerateEsRequestErrorApiResponseMockProps
  ) => {
    esClientMock[method].mockImplementation(() => {
      return elasticsearchServiceMock.createErrorTransportRequestPromise(
        new ResponseError(generateEsRequestErrorApiResponseMock(options))
      );
    });
  };

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createInternalClient();
  });

  describe('and calling `getArtifact()`', () => {
    it('should get artifact using id', async () => {
      esClientMock.get.mockImplementation(() => {
        return elasticsearchServiceMock.createSuccessTransportRequestPromise(
          generateArtifactEsSearchHitMock()
        );
      });

      expect(await getArtifact(esClientMock, '123')).toEqual(generateArtifactMock());
      expect(esClientMock.get).toHaveBeenCalledWith({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        id: '123',
      });
    });

    it('should return undefined if artifact is not found', async () => {
      setEsClientMethodResponseToError('get', { statusCode: 404 });
      expect(await getArtifact(esClientMock, '123')).toBeUndefined();
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      esClientMock.get.mockImplementation(() => {
        return elasticsearchServiceMock.createErrorTransportRequestPromise(
          new ResponseError(generateEsRequestErrorApiResponseMock())
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
        id: expect.any(String),
        body: {
          ...newArtifact,
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

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      setEsClientMethodResponseToError('create');
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
      });
    });

    it('should throw an ArtifactElasticsearchError if one is encountered', async () => {
      setEsClientMethodResponseToError('delete');

      await expect(deleteArtifact(esClientMock, '123')).rejects.toBeInstanceOf(
        ArtifactsElasticsearchError
      );
    });
  });

  describe('and calling `listArtifacts()`', () => {
    it.todo('should use defaults when options is not provided');

    it.todo('should allow for options to be defined');

    it.todo('should calculate correct elasticsearch `from` value');

    it.todo('should throw an ArtifactElasticsearchError if one is encountered');
  });

  describe('and calling `generateArtifactContentHash()`', () => {
    it.todo('should return a sha256 string');
  });

  describe('and calling `encodeArtifactContent()`', () => {
    it.todo('should encode content');
  });
});
