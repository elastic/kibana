/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';
import { EndpointArtifactClient } from './artifact_client';
import { createArtifactsClientMock } from '@kbn/fleet-plugin/server/mocks';

describe('artifact_client', () => {
  describe('ArtifactClient sanity checks', () => {
    let fleetArtifactClient: ReturnType<typeof createArtifactsClientMock>;
    let artifactClient: EndpointArtifactClient;

    beforeEach(() => {
      fleetArtifactClient = createArtifactsClientMock();
      artifactClient = new EndpointArtifactClient(fleetArtifactClient);
    });

    test('can create ArtifactClient', () => {
      expect(artifactClient).toBeInstanceOf(EndpointArtifactClient);
    });

    test('can get artifact', async () => {
      await artifactClient.getArtifact('abcd');
      expect(fleetArtifactClient.listArtifacts).toHaveBeenCalled();
    });

    test('can list artifact', async () => {
      const response = await artifactClient.listArtifacts();
      expect(fleetArtifactClient.listArtifacts).toHaveBeenCalled();
      expect(response.items[0].id).toEqual('123');
    });

    test('can create artifact', async () => {
      const artifact = await getInternalArtifactMock('linux', 'v1');
      await artifactClient.createArtifact(artifact);
      expect(fleetArtifactClient.createArtifact).toHaveBeenCalledWith({
        identifier: artifact.identifier,
        type: 'exceptionlist',
        content:
          '{"entries":[{"type":"simple","entries":[{"entries":[{"field":"some.nested.field","operator":"included","type":"exact_cased","value":"some value"}],' +
          '"field":"some.parentField","type":"nested"},{"field":"some.not.nested.field","operator":"included","type":"exact_cased","value":"some value"}]},' +
          '{"type":"simple","entries":[{"field":"some.other.not.nested.field","operator":"included","type":"exact_cased","value":"some other value"}]}]}',
      });
    });

    test('can delete artifact', async () => {
      await artifactClient.deleteArtifact('endpoint-trustlist-linux-v1-sha26hash');
      expect(fleetArtifactClient.listArtifacts).toHaveBeenCalledWith({
        kuery: `decoded_sha256: "sha26hash" AND identifier: "endpoint-trustlist-linux-v1"`,
        perPage: 1,
      });
      expect(fleetArtifactClient.deleteArtifact).toHaveBeenCalledWith('123');
    });
  });
});
