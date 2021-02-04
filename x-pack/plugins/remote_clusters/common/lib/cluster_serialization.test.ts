/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeCluster, serializeCluster } from './cluster_serialization';

describe('cluster_serialization', () => {
  describe('deserializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      // @ts-ignore
      expect(() => deserializeCluster('foo', 'bar')).toThrowError();
    });

    it('should deserialize a complete default cluster object', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          mode: 'sniff',
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          transport: {
            ping_schedule: '-1',
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        mode: 'sniff',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
      });
    });

    it('should deserialize a complete "proxy" mode cluster object', () => {
      expect(
        deserializeCluster('test_cluster', {
          proxy_address: 'localhost:9300',
          mode: 'proxy',
          connected: true,
          num_proxy_sockets_connected: 1,
          max_proxy_socket_connections: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          server_name: 'my_server_name',
          transport: {
            ping_schedule: '-1',
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        mode: 'proxy',
        proxyAddress: 'localhost:9300',
        isConnected: true,
        connectedSocketsCount: 1,
        proxySocketConnections: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        serverName: 'my_server_name',
      });
    });

    it('should deserialize a cluster object without transport information', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
        })
      ).toEqual({
        name: 'test_cluster',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
      });
    });

    it('should deserialize a cluster that contains a deprecated proxy address', () => {
      expect(
        deserializeCluster(
          'test_cluster',
          {
            seeds: ['localhost:9300'],
            connected: true,
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
            transport: {
              ping_schedule: '-1',
              compress: false,
            },
          },
          'localhost:9300'
        )
      ).toEqual({
        name: 'test_cluster',
        proxyAddress: 'localhost:9300',
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
      });
    });

    it('should deserialize a cluster that contains a deprecated proxy address and is in cloud', () => {
      expect(
        deserializeCluster(
          'test_cluster',
          {
            seeds: ['localhost:9300'],
            connected: true,
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
            transport: {
              ping_schedule: '-1',
              compress: false,
            },
          },
          'localhost:9300',
          true
        )
      ).toEqual({
        name: 'test_cluster',
        proxyAddress: 'localhost:9300',
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        serverName: 'localhost',
      });
    });

    it('should deserialize a cluster object with arbitrary missing properties', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          num_nodes_connected: 1,
          initial_connect_timeout: '30s',
          transport: {
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        initialConnectTimeout: '30s',
        transportCompress: false,
      });
    });
  });

  describe('serializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      // @ts-ignore
      expect(() => serializeCluster('foo')).toThrowError();
    });

    it('should serialize a cluster that has a deprecated proxy setting', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          proxyAddress: 'localhost:9300',
          mode: 'proxy',
          isConnected: true,
          skipUnavailable: false,
          proxySocketConnections: 18,
          serverName: 'localhost',
          hasDeprecatedProxySetting: true,
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: 'proxy',
                proxy_socket_connections: 18,
                proxy_address: 'localhost:9300',
                skip_unavailable: false,
                server_name: 'localhost',
                proxy: null,
                seeds: null,
                node_connections: null,
              },
            },
          },
        },
      });
    });

    it('should serialize a complete cluster object to only dynamic properties', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          seeds: ['localhost:9300'],
          isConnected: true,
          connectedNodesCount: 1,
          maxConnectionsPerCluster: 3,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          transportPingSchedule: '-1',
          transportCompress: false,
          mode: 'sniff',
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: 'sniff',
                node_connections: null,
                proxy_address: null,
                proxy_socket_connections: null,
                seeds: ['localhost:9300'],
                skip_unavailable: false,
                server_name: null,
              },
            },
          },
        },
      });
    });

    it('should serialize a cluster object with missing properties', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          seeds: ['localhost:9300'],
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: null,
                node_connections: null,
                proxy_address: null,
                proxy_socket_connections: null,
                seeds: ['localhost:9300'],
                skip_unavailable: null,
                server_name: null,
              },
            },
          },
        },
      });
    });
  });
});
