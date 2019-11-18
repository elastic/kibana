/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import singleEndpointData from './../fixtures/mapper_test/single_endpoint_data.json';
import allEndpointData from './../fixtures/mapper_test/all_endpoints_data.json';
import { SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';
import { ResponseToEndpointMapper } from './response_to_endpoint_mapper';

describe('Test Response To Endpoint Data Mapper', () => {
  describe('map hits()', () => {
    it('test map response hits', async () => {
      const response: SearchResponse<
        EndpointData
      > = (singleEndpointData as unknown) as SearchResponse<EndpointData>;
      const responseToEndpointMapper = new ResponseToEndpointMapper();
      const result = await responseToEndpointMapper.mapHits(response);
      expect(result).toHaveLength(1);
      expect(result[0].machine_id).toEqual('9b28b63f-68d8-44ee-b8c0-49ba057a53ec');
    });
  });

  describe('map inner hits()', () => {
    it('test map response inner hits', async () => {
      const response: SearchResponse<EndpointData> = (allEndpointData as unknown) as SearchResponse<
        EndpointData
      >;
      const responseToEndpointMapper = new ResponseToEndpointMapper();
      const result = await responseToEndpointMapper.mapInnerHits(response);
      expect(result).toHaveLength(3);
    });
  });
});
