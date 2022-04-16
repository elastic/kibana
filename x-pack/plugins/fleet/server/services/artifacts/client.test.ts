/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { ArtifactsClientAccessDeniedError, ArtifactsClientError } from '../../errors';

import { FleetArtifactsClient } from './client';
import {
  generateArtifactEsGetSingleHitMock,
  generateArtifactEsSearchResultHitsMock,
  generateArtifactMock,
  setEsClientMethodResponseToError,
} from './mocks';

describe('When using the Fleet Artifacts Client', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;
  let artifactClient: FleetArtifactsClient;

  const setEsClientGetMock = (withInvalidArtifact?: boolean) => {
    const singleHit = generateArtifactEsGetSingleHitMock();

    if (withInvalidArtifact) {
      singleHit._source.package_name = 'not endpoint';
    }

    // @ts-expect-error not full interface
    esClientMock.get.mockResponse(singleHit);
  };

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createInternalClient();
    artifactClient = new FleetArtifactsClient(esClientMock, 'endpoint');
  });

  it('should error if input argument is not set', () => {
    expect(() => new FleetArtifactsClient(esClientMock, '')).toThrow(ArtifactsClientError);
  });

  describe('and calling `getArtifact()`', () => {
    it('should retrieve artifact', async () => {
      setEsClientGetMock();
      expect(await artifactClient.getArtifact('123')).toEqual(generateArtifactMock());
    });

    it('should throw error if artifact is not for packageName', async () => {
      setEsClientGetMock(true);
      await expect(artifactClient.getArtifact('123')).rejects.toBeInstanceOf(
        ArtifactsClientAccessDeniedError
      );
    });
  });

  describe('and calling `createArtifact()`', () => {
    it('should create a new artifact', async () => {
      expect(
        await artifactClient.createArtifact({
          content: '{ "key": "value" }',
          identifier: 'some-identifier',
          type: 'type A',
        })
      ).toEqual({
        ...generateArtifactMock(),
        body: 'eJyrVlDKTq1UslJQKkvMKU1VUqgFADNPBYE=',
        created: expect.any(String),
        decodedSha256: '05d13b11501327cc43f9a29165f1b4cab5c65783d86227536fcf798e6fa45586',
        decodedSize: 18,
        encodedSha256: '373d059bac3b51b05af96128cdaf013abd0c59d3d50579589937068059690a68',
        encodedSize: 26,
        id: expect.any(String),
        identifier: 'some-identifier',
        relative_url:
          '/api/fleet/artifacts/some-identifier/05d13b11501327cc43f9a29165f1b4cab5c65783d86227536fcf798e6fa45586',
        type: 'type A',
      });
    });
  });

  describe('and calling `deleteArtifact()`', () => {
    it('should delete the artifact', async () => {
      setEsClientGetMock();
      await artifactClient.deleteArtifact('123');
      expect(esClientMock.delete).toHaveBeenCalledWith(expect.objectContaining({ id: '123' }));
    });

    it('should throw error if artifact is not for packageName', async () => {
      setEsClientGetMock(true);
      await expect(artifactClient.deleteArtifact('123')).rejects.toThrow(
        ArtifactsClientAccessDeniedError
      );
    });

    it('should do nothing if artifact does not exist', async () => {
      setEsClientMethodResponseToError(esClientMock, 'get', { statusCode: 404 });
      await artifactClient.deleteArtifact('123');
      expect(esClientMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('and calling `listArtifacts()`', () => {
    beforeEach(() => {
      esClientMock.search.mockResponse(generateArtifactEsSearchResultHitsMock());
    });

    it('should retrieve list bound to packageName', async () => {
      expect(
        await artifactClient.listArtifacts({
          sortField: 'created',
          sortOrder: 'desc',
          kuery: 'identifier: one',
          page: 2,
          perPage: 100,
        })
      ).toEqual({
        items: [generateArtifactMock()],
        total: 1,
        perPage: 100,
        page: 2,
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          q: '(package_name: "endpoint") AND identifier: one',
        })
      );
    });

    it('should add packageName kuery to every call', async () => {
      expect(await artifactClient.listArtifacts()).toEqual({
        items: [generateArtifactMock()],
        total: 1,
        perPage: 20,
        page: 1,
      });
      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          q: '(package_name: "endpoint")',
        })
      );
    });
  });

  describe('and calling `generateHash()`', () => {
    it('should return a hash', () => {
      expect(artifactClient.generateHash('{ "key": "value" }')).toBe(
        '05d13b11501327cc43f9a29165f1b4cab5c65783d86227536fcf798e6fa45586'
      );
    });
  });

  describe('and calling `encodeContent()`', () => {
    it('should encode content', async () => {
      expect(await artifactClient.encodeContent('{ "key": "value" }')).toEqual({
        body: 'eJyrVlDKTq1UslJQKkvMKU1VUqgFADNPBYE=',
        compressionAlgorithm: 'zlib',
        decodedSha256: '05d13b11501327cc43f9a29165f1b4cab5c65783d86227536fcf798e6fa45586',
        decodedSize: 18,
        encodedSha256: '373d059bac3b51b05af96128cdaf013abd0c59d3d50579589937068059690a68',
        encodedSize: 26,
      });
    });
  });
});
