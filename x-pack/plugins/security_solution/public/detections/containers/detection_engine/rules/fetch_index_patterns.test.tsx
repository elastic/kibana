/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { useApolloClient } from '../../../../common/utils/apollo_context';
import { mocksSource } from '../../../../common/containers/source/mock';

import { useFetchIndexPatterns, Return } from './fetch_index_patterns';

const mockUseApolloClient = useApolloClient as jest.Mock;
jest.mock('../../../../common/utils/apollo_context');

describe('useFetchIndexPatterns', () => {
  beforeEach(() => {
    mockUseApolloClient.mockClear();
  });
  test('happy path', async () => {
    await act(async () => {
      mockUseApolloClient.mockImplementation(() => ({
        query: () => Promise.resolve(mocksSource[0].result),
      }));
      const { result, waitForNextUpdate } = renderHook<unknown, Return>(() =>
        useFetchIndexPatterns(DEFAULT_INDEX_PATTERN)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        {
          browserFields: {
            base: {
              fields: {
                '@timestamp': {
                  category: 'base',
                  description:
                    'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
                  example: '2016-05-23T08:05:34.853Z',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: '@timestamp',
                  searchable: true,
                  type: 'date',
                  aggregatable: true,
                },
              },
            },
            agent: {
              fields: {
                'agent.ephemeral_id': {
                  category: 'agent',
                  description:
                    'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
                  example: '8a4f500f',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'agent.ephemeral_id',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'agent.hostname': {
                  category: 'agent',
                  description: null,
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'agent.hostname',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'agent.id': {
                  category: 'agent',
                  description:
                    'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
                  example: '8a4f500d',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'agent.id',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'agent.name': {
                  category: 'agent',
                  description:
                    'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
                  example: 'foo',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'agent.name',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
              },
            },
            auditd: {
              fields: {
                'auditd.data.a0': {
                  category: 'auditd',
                  description: null,
                  example: null,
                  format: '',
                  indexes: ['auditbeat'],
                  name: 'auditd.data.a0',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'auditd.data.a1': {
                  category: 'auditd',
                  description: null,
                  example: null,
                  format: '',
                  indexes: ['auditbeat'],
                  name: 'auditd.data.a1',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'auditd.data.a2': {
                  category: 'auditd',
                  description: null,
                  example: null,
                  format: '',
                  indexes: ['auditbeat'],
                  name: 'auditd.data.a2',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
              },
            },
            client: {
              fields: {
                'client.address': {
                  category: 'client',
                  description:
                    'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'client.address',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'client.bytes': {
                  category: 'client',
                  description: 'Bytes sent from the client to the server.',
                  example: '184',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'client.bytes',
                  searchable: true,
                  type: 'number',
                  aggregatable: true,
                },
                'client.domain': {
                  category: 'client',
                  description: 'Client domain.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'client.domain',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'client.geo.country_iso_code': {
                  category: 'client',
                  description: 'Country ISO code.',
                  example: 'CA',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'client.geo.country_iso_code',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
              },
            },
            cloud: {
              fields: {
                'cloud.account.id': {
                  category: 'cloud',
                  description:
                    'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
                  example: '666777888999',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'cloud.account.id',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'cloud.availability_zone': {
                  category: 'cloud',
                  description: 'Availability zone in which this host is running.',
                  example: 'us-east-1c',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'cloud.availability_zone',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
              },
            },
            container: {
              fields: {
                'container.id': {
                  category: 'container',
                  description: 'Unique container id.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'container.id',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'container.image.name': {
                  category: 'container',
                  description: 'Name of the image the container was built on.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'container.image.name',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'container.image.tag': {
                  category: 'container',
                  description: 'Container image tag.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'container.image.tag',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
              },
            },
            destination: {
              fields: {
                'destination.address': {
                  category: 'destination',
                  description:
                    'Some event destination addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'destination.address',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'destination.bytes': {
                  category: 'destination',
                  description: 'Bytes sent from the destination to the source.',
                  example: '184',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'destination.bytes',
                  searchable: true,
                  type: 'number',
                  aggregatable: true,
                },
                'destination.domain': {
                  category: 'destination',
                  description: 'Destination domain.',
                  example: null,
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'destination.domain',
                  searchable: true,
                  type: 'string',
                  aggregatable: true,
                },
                'destination.ip': {
                  aggregatable: true,
                  category: 'destination',
                  description:
                    'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
                  example: '',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'destination.ip',
                  searchable: true,
                  type: 'ip',
                },
                'destination.port': {
                  aggregatable: true,
                  category: 'destination',
                  description: 'Port of the destination.',
                  example: '',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'destination.port',
                  searchable: true,
                  type: 'long',
                },
              },
            },
            source: {
              fields: {
                'source.ip': {
                  aggregatable: true,
                  category: 'source',
                  description:
                    'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
                  example: '',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'source.ip',
                  searchable: true,
                  type: 'ip',
                },
                'source.port': {
                  aggregatable: true,
                  category: 'source',
                  description: 'Port of the source.',
                  example: '',
                  format: '',
                  indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                  name: 'source.port',
                  searchable: true,
                  type: 'long',
                },
              },
            },
            event: {
              fields: {
                'event.end': {
                  aggregatable: true,
                  category: 'event',
                  description:
                    'event.end contains the date when the event ended or when the activity was last observed.',
                  example: null,
                  format: '',
                  indexes: [
                    'apm-*-transaction*',
                    'auditbeat-*',
                    'endgame-*',
                    'filebeat-*',
                    'packetbeat-*',
                    'winlogbeat-*',
                    'logs-*',
                  ],
                  name: 'event.end',
                  searchable: true,
                  type: 'date',
                },
              },
            },
          },
          isLoading: false,
          indices: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'packetbeat-*',
            'winlogbeat-*',
            'logs-*',
          ],
          indicesExists: true,
          indexPatterns: {
            fields: [
              { name: '@timestamp', searchable: true, type: 'date', aggregatable: true },
              { name: 'agent.ephemeral_id', searchable: true, type: 'string', aggregatable: true },
              { name: 'agent.hostname', searchable: true, type: 'string', aggregatable: true },
              { name: 'agent.id', searchable: true, type: 'string', aggregatable: true },
              { name: 'agent.name', searchable: true, type: 'string', aggregatable: true },
              { name: 'auditd.data.a0', searchable: true, type: 'string', aggregatable: true },
              { name: 'auditd.data.a1', searchable: true, type: 'string', aggregatable: true },
              { name: 'auditd.data.a2', searchable: true, type: 'string', aggregatable: true },
              { name: 'client.address', searchable: true, type: 'string', aggregatable: true },
              { name: 'client.bytes', searchable: true, type: 'number', aggregatable: true },
              { name: 'client.domain', searchable: true, type: 'string', aggregatable: true },
              {
                name: 'client.geo.country_iso_code',
                searchable: true,
                type: 'string',
                aggregatable: true,
              },
              { name: 'cloud.account.id', searchable: true, type: 'string', aggregatable: true },
              {
                name: 'cloud.availability_zone',
                searchable: true,
                type: 'string',
                aggregatable: true,
              },
              { name: 'container.id', searchable: true, type: 'string', aggregatable: true },
              {
                name: 'container.image.name',
                searchable: true,
                type: 'string',
                aggregatable: true,
              },
              { name: 'container.image.tag', searchable: true, type: 'string', aggregatable: true },
              { name: 'destination.address', searchable: true, type: 'string', aggregatable: true },
              { name: 'destination.bytes', searchable: true, type: 'number', aggregatable: true },
              { name: 'destination.domain', searchable: true, type: 'string', aggregatable: true },
              { name: 'destination.ip', searchable: true, type: 'ip', aggregatable: true },
              { name: 'destination.port', searchable: true, type: 'long', aggregatable: true },
              { name: 'source.ip', searchable: true, type: 'ip', aggregatable: true },
              { name: 'source.port', searchable: true, type: 'long', aggregatable: true },
              { name: 'event.end', searchable: true, type: 'date', aggregatable: true },
            ],
            title:
              'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,logs-*',
          },
        },
        result.current[1],
      ]);
    });
  });

  test('unhappy path', async () => {
    await act(async () => {
      mockUseApolloClient.mockImplementation(() => ({
        query: () => Promise.reject(new Error('Something went wrong')),
      }));
      const { result, waitForNextUpdate } = renderHook<unknown, Return>(() =>
        useFetchIndexPatterns(DEFAULT_INDEX_PATTERN)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        {
          browserFields: {},
          indexPatterns: {
            fields: [],
            title: '',
          },
          indices: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'packetbeat-*',
            'winlogbeat-*',
            'logs-*',
          ],
          indicesExists: false,
          isLoading: false,
        },
        result.current[1],
      ]);
    });
  });
});
