/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getConnections } from './get_service_map_from_trace_ids';
import serviceMapFromTraceIdsScriptResponse from './mock_responses/get_service_map_from_trace_ids_script_response.json';
import { PromiseReturnType } from '../../../typings/common';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

describe('getConnections', () => {
  describe('if no filter is given', () => {
    it('includes all connections', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections(
        response.aggregations?.service_map.value.paths
      );

      expect(connections).toMatchSnapshot();
    });
  });

  describe('if service name and environment are given', () => {
    it('excludes connections with different service name and environment', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const serviceName = 'opbeans-node';
      const environment = 'production';

      const connections = getConnections(
        response.aggregations?.service_map.value.paths,
        serviceName,
        environment
      );
      expect(
        connections.every(
          (conn) => conn.source['service.environment'] === environment
        )
      ).toBeTruthy();
      expect(connections).toMatchSnapshot();
    });
  });

  describe('if service name is given', () => {
    it('excludes connections with different service name', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const serviceName = 'opbeans-node';

      const connections = getConnections(
        response.aggregations?.service_map.value.paths,
        serviceName
      );

      expect(connections).toMatchSnapshot();
    });
  });

  describe('if environment is given', () => {
    it('excludes connections with different environment', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const environment = 'testing';

      const connections = getConnections(
        response.aggregations?.service_map.value.paths,
        undefined,
        environment
      );

      expect(
        connections.every(
          (conn) => conn.source['service.environment'] === environment
        )
      ).toBeTruthy();
    });
  });

  describe('if environment is "not defined"', () => {
    it('excludes connections with source environment set', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const environment = 'ENVIRONMENT_NOT_DEFINED';

      const connections = getConnections(
        response.aggregations?.service_map.value.paths,
        undefined,
        environment
      );

      expect(connections).toMatchSnapshot();
    });
  });

  describe('if environment is "all" (missing)', () => {
    it('includes both connections with and without source environment set', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const connections = getConnections(
        response.aggregations?.service_map.value.paths
      );

      expect(connections).toMatchSnapshot();
    });
  });
});
