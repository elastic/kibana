/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, isArray } from 'lodash/fp';

import { convertSchemaToAssociativeArray, getIndexSchemaDoc } from '.';
import { auditbeatSchema, filebeatSchema, packetbeatSchema } from './8.0.0';
import { Schema } from './type';

describe('Schema Beat', () => {
  describe('Transform Schema documentation to an associative array', () => {
    test('Auditbeat transformation', async () => {
      const convertData: Schema = cloneDeep(auditbeatSchema).slice(0, 1);
      convertData[0].fields = isArray(convertData[0].fields)
        ? convertData[0].fields!.slice(0, 6)
        : [];
      expect(convertSchemaToAssociativeArray(convertData)).toEqual({
        '@timestamp': {
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          name: '@timestamp',
          type: 'date',
        },
        tags: {
          description: 'List of keywords used to tag each event.',
          example: '["production", "env2"]',
          name: 'tags',
          type: 'keyword',
        },
        labels: {
          description:
            'Key/value pairs. Can be used to add meta information to events. Should not contain nested objects. All values are stored as keyword. Example: `docker` and `k8s` labels.',
          example: '{"env":"production","application":"foo-bar"}',
          name: 'labels',
          type: 'object',
        },
        message: {
          description:
            'For log events the message field contains the log message. In other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
          example: 'Hello World',
          name: 'message',
          type: 'text',
        },
        agent: {
          description:
            'The agent fields contain the data about the software entity, if any, that collects, detects, or observes events on a host, or takes measurements on a host. Examples include Beats. Agents may also run on observers. ECS agent.* fields shall be populated with details of the agent running on the host or observer where the event happened or the measurement was taken.',
          name: 'agent',
          type: 'group',
          fields: {
            'agent.version': {
              description: 'Version of the agent.',
              example: '6.0.0-rc2',
              name: 'version',
              type: 'keyword',
            },
            'agent.name': {
              description:
                'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
              example: 'foo',
              name: 'name',
              type: 'keyword',
            },
            'agent.type': {
              description:
                'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
              example: 'filebeat',
              name: 'type',
              type: 'keyword',
            },
            'agent.id': {
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              name: 'id',
              type: 'keyword',
            },
            'agent.ephemeral_id': {
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              name: 'ephemeral_id',
              type: 'keyword',
            },
          },
        },
        client: {
          description:
            'A client is defined as the initiator of a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the client is the initiator of the TCP connection that sends the SYN packet(s). For other protocols, the client is generally the initiator or requestor in the network transaction. Some systems use the term "originator" to refer the client in TCP connections. The client fields describe details about the system acting as the client in the network event. Client fields are usually populated in conjunction with server fields.  Client fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
          name: 'client',
          type: 'group',
          fields: {
            'client.address': {
              description:
                'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
              name: 'address',
              type: 'keyword',
            },
            'client.ip': {
              description:
                'IP address of the client. Can be one or multiple IPv4 or IPv6 addresses.',
              name: 'ip',
              type: 'ip',
            },
            'client.port': {
              description: 'Port of the client.',
              name: 'port',
              type: 'long',
            },
            'client.mac': {
              description: 'MAC address of the client.',
              name: 'mac',
              type: 'keyword',
            },
            'client.domain': {
              description: 'Client domain.',
              name: 'domain',
              type: 'keyword',
            },
            'client.bytes': {
              description: 'Bytes sent from the client to the server.',
              example: 184,
              name: 'bytes',
              type: 'long',
            },
            'client.packets': {
              description: 'Packets sent from the client to the server.',
              example: 12,
              name: 'packets',
              type: 'long',
            },
            'client.geo': {
              description:
                'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
              name: 'geo',
              type: 'group',
            },
            'client.geo.location': {
              description: 'Longitude and latitude.',
              example: '{ "lon": -73.614830, "lat": 45.505918 }',
              name: 'location',
              type: 'geo_point',
            },
            'client.geo.continent_name': {
              description: 'Name of the continent.',
              example: 'North America',
              name: 'continent_name',
              type: 'keyword',
            },
            'client.geo.country_name': {
              description: 'Country name.',
              example: 'Canada',
              name: 'country_name',
              type: 'keyword',
            },
            'client.geo.region_name': {
              description: 'Region name.',
              example: 'Quebec',
              name: 'region_name',
              type: 'keyword',
            },
            'client.geo.city_name': {
              description: 'City name.',
              example: 'Montreal',
              name: 'city_name',
              type: 'keyword',
            },
            'client.geo.country_iso_code': {
              description: 'Country ISO code.',
              example: 'CA',
              name: 'country_iso_code',
              type: 'keyword',
            },
            'client.geo.region_iso_code': {
              description: 'Region ISO code.',
              example: 'CA-QC',
              name: 'region_iso_code',
              type: 'keyword',
            },
            'client.geo.name': {
              description:
                'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
              example: 'boston-dc',
              name: 'name',
              type: 'keyword',
            },
          },
        },
      });
    });

    test('Filebeat transformation', async () => {
      const convertData: Schema = cloneDeep(filebeatSchema).slice(0, 1);
      convertData[0].fields = isArray(convertData[0].fields)
        ? convertData[0].fields!.slice(0, 6)
        : [];
      expect(convertSchemaToAssociativeArray(convertData)).toEqual({
        '@timestamp': {
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          name: '@timestamp',
          type: 'date',
        },
        tags: {
          description: 'List of keywords used to tag each event.',
          example: '["production", "env2"]',
          name: 'tags',
          type: 'keyword',
        },
        labels: {
          description:
            'Key/value pairs. Can be used to add meta information to events. Should not contain nested objects. All values are stored as keyword. Example: `docker` and `k8s` labels.',
          example: '{"env":"production","application":"foo-bar"}',
          name: 'labels',
          type: 'object',
        },
        message: {
          description:
            'For log events the message field contains the log message. In other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
          example: 'Hello World',
          name: 'message',
          type: 'text',
        },
        agent: {
          description:
            'The agent fields contain the data about the software entity, if any, that collects, detects, or observes events on a host, or takes measurements on a host. Examples include Beats. Agents may also run on observers. ECS agent.* fields shall be populated with details of the agent running on the host or observer where the event happened or the measurement was taken.',
          name: 'agent',
          type: 'group',
          fields: {
            'agent.version': {
              description: 'Version of the agent.',
              example: '6.0.0-rc2',
              name: 'version',
              type: 'keyword',
            },
            'agent.name': {
              description:
                'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
              example: 'foo',
              name: 'name',
              type: 'keyword',
            },
            'agent.type': {
              description:
                'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
              example: 'filebeat',
              name: 'type',
              type: 'keyword',
            },
            'agent.id': {
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              name: 'id',
              type: 'keyword',
            },
            'agent.ephemeral_id': {
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              name: 'ephemeral_id',
              type: 'keyword',
            },
          },
        },
        client: {
          description:
            'A client is defined as the initiator of a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the client is the initiator of the TCP connection that sends the SYN packet(s). For other protocols, the client is generally the initiator or requestor in the network transaction. Some systems use the term "originator" to refer the client in TCP connections. The client fields describe details about the system acting as the client in the network event. Client fields are usually populated in conjunction with server fields.  Client fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
          name: 'client',
          type: 'group',
          fields: {
            'client.address': {
              description:
                'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
              name: 'address',
              type: 'keyword',
            },
            'client.ip': {
              description:
                'IP address of the client. Can be one or multiple IPv4 or IPv6 addresses.',
              name: 'ip',
              type: 'ip',
            },
            'client.port': {
              description: 'Port of the client.',
              name: 'port',
              type: 'long',
            },
            'client.mac': {
              description: 'MAC address of the client.',
              name: 'mac',
              type: 'keyword',
            },
            'client.domain': {
              description: 'Client domain.',
              name: 'domain',
              type: 'keyword',
            },
            'client.bytes': {
              description: 'Bytes sent from the client to the server.',
              example: 184,
              name: 'bytes',
              type: 'long',
            },
            'client.packets': {
              description: 'Packets sent from the client to the server.',
              example: 12,
              name: 'packets',
              type: 'long',
            },
            'client.geo': {
              description:
                'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
              name: 'geo',
              type: 'group',
            },
            'client.geo.location': {
              description: 'Longitude and latitude.',
              example: '{ "lon": -73.614830, "lat": 45.505918 }',
              name: 'location',
              type: 'geo_point',
            },
            'client.geo.continent_name': {
              description: 'Name of the continent.',
              example: 'North America',
              name: 'continent_name',
              type: 'keyword',
            },
            'client.geo.country_name': {
              description: 'Country name.',
              example: 'Canada',
              name: 'country_name',
              type: 'keyword',
            },
            'client.geo.region_name': {
              description: 'Region name.',
              example: 'Quebec',
              name: 'region_name',
              type: 'keyword',
            },
            'client.geo.city_name': {
              description: 'City name.',
              example: 'Montreal',
              name: 'city_name',
              type: 'keyword',
            },
            'client.geo.country_iso_code': {
              description: 'Country ISO code.',
              example: 'CA',
              name: 'country_iso_code',
              type: 'keyword',
            },
            'client.geo.region_iso_code': {
              description: 'Region ISO code.',
              example: 'CA-QC',
              name: 'region_iso_code',
              type: 'keyword',
            },
            'client.geo.name': {
              description:
                'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
              example: 'boston-dc',
              name: 'name',
              type: 'keyword',
            },
          },
        },
      });
    });

    test('Packetbeat transformation', async () => {
      const convertData: Schema = cloneDeep(packetbeatSchema).slice(0, 1);
      convertData[0].fields = isArray(convertData[0].fields)
        ? convertData[0].fields!.slice(0, 6)
        : [];
      expect(convertSchemaToAssociativeArray(convertData)).toEqual({
        '@timestamp': {
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          name: '@timestamp',
          type: 'date',
        },
        tags: {
          description: 'List of keywords used to tag each event.',
          example: '["production", "env2"]',
          name: 'tags',
          type: 'keyword',
        },
        labels: {
          description:
            'Key/value pairs. Can be used to add meta information to events. Should not contain nested objects. All values are stored as keyword. Example: `docker` and `k8s` labels.',
          example: '{"env":"production","application":"foo-bar"}',
          name: 'labels',
          type: 'object',
        },
        message: {
          description:
            'For log events the message field contains the log message. In other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
          example: 'Hello World',
          name: 'message',
          type: 'text',
        },
        agent: {
          description:
            'The agent fields contain the data about the software entity, if any, that collects, detects, or observes events on a host, or takes measurements on a host. Examples include Beats. Agents may also run on observers. ECS agent.* fields shall be populated with details of the agent running on the host or observer where the event happened or the measurement was taken.',
          name: 'agent',
          type: 'group',
          fields: {
            'agent.version': {
              description: 'Version of the agent.',
              example: '6.0.0-rc2',
              name: 'version',
              type: 'keyword',
            },
            'agent.name': {
              description:
                'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
              example: 'foo',
              name: 'name',
              type: 'keyword',
            },
            'agent.type': {
              description:
                'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
              example: 'filebeat',
              name: 'type',
              type: 'keyword',
            },
            'agent.id': {
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              name: 'id',
              type: 'keyword',
            },
            'agent.ephemeral_id': {
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              name: 'ephemeral_id',
              type: 'keyword',
            },
          },
        },
        client: {
          description:
            'A client is defined as the initiator of a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the client is the initiator of the TCP connection that sends the SYN packet(s). For other protocols, the client is generally the initiator or requestor in the network transaction. Some systems use the term "originator" to refer the client in TCP connections. The client fields describe details about the system acting as the client in the network event. Client fields are usually populated in conjunction with server fields.  Client fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
          name: 'client',
          type: 'group',
          fields: {
            'client.address': {
              description:
                'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
              name: 'address',
              type: 'keyword',
            },
            'client.ip': {
              description:
                'IP address of the client. Can be one or multiple IPv4 or IPv6 addresses.',
              name: 'ip',
              type: 'ip',
            },
            'client.port': {
              description: 'Port of the client.',
              name: 'port',
              type: 'long',
            },
            'client.mac': {
              description: 'MAC address of the client.',
              name: 'mac',
              type: 'keyword',
            },
            'client.domain': {
              description: 'Client domain.',
              name: 'domain',
              type: 'keyword',
            },
            'client.bytes': {
              description: 'Bytes sent from the client to the server.',
              example: 184,
              name: 'bytes',
              type: 'long',
            },
            'client.packets': {
              description: 'Packets sent from the client to the server.',
              example: 12,
              name: 'packets',
              type: 'long',
            },
            'client.geo': {
              description:
                'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
              name: 'geo',
              type: 'group',
            },
            'client.geo.location': {
              description: 'Longitude and latitude.',
              example: '{ "lon": -73.614830, "lat": 45.505918 }',
              name: 'location',
              type: 'geo_point',
            },
            'client.geo.continent_name': {
              description: 'Name of the continent.',
              example: 'North America',
              name: 'continent_name',
              type: 'keyword',
            },
            'client.geo.country_name': {
              description: 'Country name.',
              example: 'Canada',
              name: 'country_name',
              type: 'keyword',
            },
            'client.geo.region_name': {
              description: 'Region name.',
              example: 'Quebec',
              name: 'region_name',
              type: 'keyword',
            },
            'client.geo.city_name': {
              description: 'City name.',
              example: 'Montreal',
              name: 'city_name',
              type: 'keyword',
            },
            'client.geo.country_iso_code': {
              description: 'Country ISO code.',
              example: 'CA',
              name: 'country_iso_code',
              type: 'keyword',
            },
            'client.geo.region_iso_code': {
              description: 'Region ISO code.',
              example: 'CA-QC',
              name: 'region_iso_code',
              type: 'keyword',
            },
            'client.geo.name': {
              description:
                'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
              example: 'boston-dc',
              name: 'name',
              type: 'keyword',
            },
          },
        },
      });
    });
  });

  describe('GetIndexSchemaDoc', () => {
    test('Filebeat transformation', async () => {
      expect(Object.keys(getIndexSchemaDoc('auditbeat'))).toEqual([
        '_id',
        '_index',
        '@timestamp',
        'tags',
        'labels',
        'message',
        'agent',
        'client',
        'cloud',
        'container',
        'destination',
        'ecs',
        'error',
        'event',
        'file',
        'group',
        'host',
        'http',
        'log',
        'network',
        'observer',
        'organization',
        'os',
        'process',
        'related',
        'server',
        'service',
        'source',
        'url',
        'user',
        'user_agent',
        'agent.hostname',
        'beat.timezone',
        'fields',
        'beat.name',
        'beat.hostname',
        'cloud.project.id',
        'meta.cloud.provider',
        'meta.cloud.instance_id',
        'meta.cloud.instance_name',
        'meta.cloud.machine_type',
        'meta.cloud.availability_zone',
        'meta.cloud.project_id',
        'meta.cloud.region',
        'docker',
        'kubernetes',
        'type',
        'server.process.name',
        'server.process.args',
        'server.process.executable',
        'server.process.working_directory',
        'server.process.start',
        'client.process.name',
        'client.process.args',
        'client.process.executable',
        'client.process.working_directory',
        'client.process.start',
        'real_ip',
        'transport',
        'flow.final',
        'flow.id',
        'flow.vlan',
        'flow_id',
        'final',
        'vlan',
        'source.stats.net_bytes_total',
        'source.stats.net_packets_total',
        'dest.stats.net_bytes_total',
        'dest.stats.net_packets_total',
        'status',
        'method',
        'resource',
        'path',
        'query',
        'params',
        'notes',
        'request',
        'response',
        'bytes_in',
        'bytes_out',
        'amqp',
        'no_request',
        'cassandra',
        'dhcpv4',
        'dns',
        'icmp',
        'memcache',
        'mongodb',
        'mysql',
        'nfs',
        'rpc',
        'pgsql',
        'redis',
        'thrift',
        'tls',
      ]);
    });
  });
});
