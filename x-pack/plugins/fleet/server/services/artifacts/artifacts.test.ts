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
} from './mocks';
import { getArtifact } from './artifacts';
import { FLEET_SERVER_ARTIFACTS_INDEX } from '../../../common';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { ArtifactsElasticsearchError } from './errors';

describe('When using the artifacts services', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

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
      esClientMock.get.mockImplementation(() => {
        return elasticsearchServiceMock.createErrorTransportRequestPromise(
          new ResponseError(generateEsRequestErrorApiResponseMock({ statusCode: 404 }))
        );
      });
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
    it.todo('should create and return artifact');

    it.todo('should throw an ArtifactElasticsearchError if one is encountered');
  });

  describe('and calling `deleteArtifact()`', () => {
    it.todo('should delete the artifact');

    it.todo('should throw an ArtifactElasticsearchError if one is encountered');
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
