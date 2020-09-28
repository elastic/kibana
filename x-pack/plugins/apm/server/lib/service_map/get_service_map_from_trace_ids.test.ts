/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getConnections } from './get_service_map_from_trace_ids';
import serviceMapFromTraceIdsScriptResponse from './mock_responses/get_service_map_from_trace_ids_script_response.json';
import serviceMapFromTraceIdsScriptResponseEnvNotDefined from './mock_responses/get_service_map_from_trace_ids_script_response_env_not_defined.json';
import { PromiseReturnType } from '../../../typings/common';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';
import { Connection } from '../../../common/service_map';

function getConnectionsPairs(connections: Connection[]) {
  return connections
    .map((conn) => {
      const source = `${conn.source['service.name']}:${conn.source['service.environment']}`;
      const destination = `${conn.destination['service.name']}:${conn.destination['service.environment']}`;
      if (conn.destination['service.name']) {
        return `${source} -> ${destination}`;
      }
    })
    .filter((_) => _)
    .sort();
}

describe('getConnections', () => {
  describe('if neither service name or environment is given', () => {
    it('includes all connections', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: undefined,
        environment: undefined,
      });
      const connectionsPairs = getConnectionsPairs(connections);
      expect(connectionsPairs).toEqual([
        'opbeans-go:testing -> opbeans-java:testing',
        'opbeans-node:production -> opbeans-python:production',
        'opbeans-node:production -> opbeans-ruby:production',
        'opbeans-python:null -> opbeans-node:null',
        'opbeans-python:production -> opbeans-node:production',
        'opbeans-python:production -> opbeans-ruby:production',
        'opbeans-ruby:production -> opbeans-node:production',
        'opbeans-ruby:production -> opbeans-python:production',
      ]);
    });
  });

  describe('if service name and environment are given', () => {
    it('shows all connections for opbeans-node and production', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: 'opbeans-node',
        environment: 'production',
      });

      const connectionsPairs = getConnectionsPairs(connections);

      expect(connectionsPairs).toEqual([
        'opbeans-node:production -> opbeans-python:production',
        'opbeans-node:production -> opbeans-ruby:production',
        'opbeans-python:production -> opbeans-node:production',
        'opbeans-python:production -> opbeans-ruby:production',
        'opbeans-ruby:production -> opbeans-node:production',
        'opbeans-ruby:production -> opbeans-python:production',
      ]);
    });

    it('shows all connections for opbeans-go and testing', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: 'opbeans-go',
        environment: 'testing',
      });

      const connectionsPairs = getConnectionsPairs(connections);

      expect(connectionsPairs).toEqual([
        'opbeans-go:testing -> opbeans-java:testing',
      ]);
    });
  });

  describe('if service name is given', () => {
    it('shows all connections for opbeans-node', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: 'opbeans-node',
        environment: undefined,
      });

      const connectionsPairs = getConnectionsPairs(connections);

      expect(connectionsPairs).toEqual([
        'opbeans-node:production -> opbeans-python:production',
        'opbeans-node:production -> opbeans-ruby:production',
        'opbeans-python:null -> opbeans-node:null',
        'opbeans-python:production -> opbeans-node:production',
        'opbeans-python:production -> opbeans-ruby:production',
        'opbeans-ruby:production -> opbeans-node:production',
        'opbeans-ruby:production -> opbeans-python:production',
      ]);
    });
  });

  describe('if environment is given', () => {
    it('shows all connections for testing environment', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: undefined,
        environment: 'testing',
      });

      const connectionsPairs = getConnectionsPairs(connections);

      expect(connectionsPairs).toEqual([
        'opbeans-go:testing -> opbeans-java:testing',
      ]);
    });
    it('shows all connections for production environment', () => {
      const response = serviceMapFromTraceIdsScriptResponse as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;

      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: undefined,
        environment: 'production',
      });

      const connectionsPairs = getConnectionsPairs(connections);

      expect(connectionsPairs).toEqual([
        'opbeans-node:production -> opbeans-python:production',
        'opbeans-node:production -> opbeans-ruby:production',
        'opbeans-python:production -> opbeans-node:production',
        'opbeans-python:production -> opbeans-ruby:production',
        'opbeans-ruby:production -> opbeans-node:production',
        'opbeans-ruby:production -> opbeans-python:production',
      ]);
    });
  });

  describe('if environment is "not defined"', () => {
    it('shows all connections where environment is not set', () => {
      const response = serviceMapFromTraceIdsScriptResponseEnvNotDefined as PromiseReturnType<
        typeof fetchServicePathsFromTraceIds
      >;
      const connections = getConnections({
        paths: response.aggregations?.service_map.value.paths,
        serviceName: undefined,
        environment: 'ENVIRONMENT_NOT_DEFINED',
      });

      const environments = new Set();

      connections.forEach((conn) =>
        environments.add(conn.source['service.environment'])
      );
      expect(
        connections.some((conn) => conn.source['service.environment'] !== null)
      ).toBeFalsy();
    });
  });
});
