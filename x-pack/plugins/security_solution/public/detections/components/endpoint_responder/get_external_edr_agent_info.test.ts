/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSentinelOneAgentId } from '../../../common/utils/sentinelone_alert_check';
import { getCrowdstrikeAgentId } from '../../../common/utils/crowdstrike_alert_check';
import { getExternalEdrAgentInfo } from './get_external_edr_agent_info';

jest.mock('../../../common/utils/sentinelone_alert_check');
jest.mock('../../../common/utils/crowdstrike_alert_check');

describe('getExternalEdrAgentInfo', () => {
  const mockEventData = [
    {
      category: 'event',
      field: 'event.module',
      values: ['sentinel_one'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.name',
      values: ['test-host'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.name',
      values: ['Windows'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.family',
      values: ['windows'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.version',
      values: ['10'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.last_detected',
      values: ['2023-05-01T12:34:56Z'],
      isObjectArray: false,
    },
    {
      category: 'crowdstrike',
      field: 'crowdstrike.event.HostName',
      values: ['test-crowdstrike-host'],
      isObjectArray: false,
    },
    {
      category: 'crowdstrike',
      field: 'crowdstrike.event.Platform',
      values: ['linux'],
      isObjectArray: false,
    },
  ];

  beforeEach(() => {
    (getSentinelOneAgentId as jest.Mock).mockReturnValue('sentinel-one-agent-id');
    (getCrowdstrikeAgentId as jest.Mock).mockReturnValue('crowdstrike-agent-id');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct info for sentinel_one agent type', () => {
    const result = getExternalEdrAgentInfo(mockEventData, 'sentinel_one');
    expect(result).toEqual({
      agent: {
        id: 'sentinel-one-agent-id',
        type: 'sentinel_one',
      },
      host: {
        name: 'test-host',
        os: {
          name: 'Windows',
          family: 'windows',
          version: '10',
        },
      },
      lastCheckin: '2023-05-01T12:34:56Z',
    });
  });

  it('should return correct info for crowdstrike agent type', () => {
    const result = getExternalEdrAgentInfo(mockEventData, 'crowdstrike');
    expect(result).toEqual({
      agent: {
        id: 'crowdstrike-agent-id',
        type: 'crowdstrike',
      },
      host: {
        name: 'test-crowdstrike-host',
        os: {
          name: '',
          family: 'linux',
          version: '',
        },
      },
      lastCheckin: '2023-05-01T12:34:56Z',
    });
  });

  it('should throw an error for unsupported agent type', () => {
    expect(() => {
      // @ts-expect-error testing purpose
      getExternalEdrAgentInfo(mockEventData, 'unsupported_agent_type');
    }).toThrow('Unsupported agent type: unsupported_agent_type');
  });
});
