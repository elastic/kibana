/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEndpointMetadataServiceTestContextMock,
  EndpointMetadataServiceTestContextMock,
} from './mocks';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClientMock } from '../../../../../../../src/core/server/elasticsearch/client/mocks';
import { createV2SearchResponse } from '../../routes/metadata/support/test_support';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { getESQueryHostMetadataByFleetAgentIds } from '../../routes/metadata/query_builders';
import { EndpointError } from '../../errors';
import { HostMetadata } from '../../../../common/endpoint/types';

describe('EndpointMetadataService', () => {
  let testMockedContext: EndpointMetadataServiceTestContextMock;
  let metadataService: EndpointMetadataServiceTestContextMock['endpointMetadataService'];
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    testMockedContext = createEndpointMetadataServiceTestContextMock();
    metadataService = testMockedContext.endpointMetadataService;
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  });

  describe('#findHostMetadataForFleetAgents()', () => {
    let fleetAgentIds: string[];
    let endpointMetadataDoc: HostMetadata;

    beforeEach(() => {
      fleetAgentIds = ['one', 'two'];
      endpointMetadataDoc = new EndpointDocGenerator().generateHostMetadata();
      esClient.search.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise(
          createV2SearchResponse(endpointMetadataDoc)
        )
      );
    });

    it('should call elasticsearch with proper filter', async () => {
      await metadataService.findHostMetadataForFleetAgents(esClient, fleetAgentIds);
      expect(esClient.search).toHaveBeenCalledWith(
        { ...getESQueryHostMetadataByFleetAgentIds(fleetAgentIds), size: fleetAgentIds.length },
        { ignore: [404] }
      );
    });

    it('should throw a wrapped elasticsearch Error when one occurs', async () => {
      esClient.search.mockRejectedValue(new Error('foo bar'));
      await expect(
        metadataService.findHostMetadataForFleetAgents(esClient, fleetAgentIds)
      ).rejects.toThrow(EndpointError);
    });

    it('should return an array of Host Metadata documents', async () => {
      const response = await metadataService.findHostMetadataForFleetAgents(
        esClient,
        fleetAgentIds
      );
      expect(response).toEqual([endpointMetadataDoc]);
    });
  });
});
