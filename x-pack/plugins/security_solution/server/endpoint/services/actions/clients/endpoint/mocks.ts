/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/transport/lib/types';
import type { ResponseActionsClientOptions } from '../lib/base_response_actions_client';
import { EndpointMetadataGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { responseActionsClientMock } from '../mocks';
import { metadataCurrentIndexPattern } from '../../../../../../common/endpoint/constants';
import { BaseDataGenerator } from '../../../../../../common/endpoint/data_generators/base_data_generator';

const createConstructorOptionsMock = (): ResponseActionsClientOptions => {
  const options = responseActionsClientMock.createConstructorOptions();
  const metadataGenerator = new EndpointMetadataGenerator('seed');

  // Add mocks to calls for endpoint metadata
  const priorEsClientSearchMock = options.esClient.search.getMockImplementation();

  // @ts-expect-error `.search()` is an overloaded function and difficult to narrow the return types
  options.esClient.search.mockImplementation(async (...searchArgs) => {
    const searchRequest = searchArgs[0];
    const searchOptions = searchArgs[1];

    if (searchRequest) {
      switch (searchRequest.index) {
        case metadataCurrentIndexPattern: {
          const searchResponse = metadataGenerator.toEsSearchResponse([
            metadataGenerator.toEsSearchHit(
              metadataGenerator.generate({
                agent: { id: '1-2-3' },
                elastic: { agent: { id: '1-2-3' } },
              })
            ),
          ]);

          if (!searchOptions?.meta) {
            return searchResponse;
          }

          return {
            body: searchResponse,
            statusCode: 200,
            headers: {},
            warnings: null,
            meta: {},
          } as unknown as TransportResult;
        }

        default:
          if (priorEsClientSearchMock) {
            return priorEsClientSearchMock(...searchArgs);
          }
      }
    }

    return BaseDataGenerator.toEsSearchResponse([]);
  });

  return options;
};

export const endpointActionClientMock = Object.freeze({
  createConstructorOptions: createConstructorOptionsMock,
});
