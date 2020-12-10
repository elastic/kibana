/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isAgentUpgradeable } from './is_agent_upgradeable';
import { Agent } from '../types/models/agent';

const getAgent = ({
  version,
  upgradeable = false,
  unenrolling = false,
  unenrolled = false,
}: {
  version: string;
  upgradeable?: boolean;
  unenrolling?: boolean;
  unenrolled?: boolean;
}): Agent => {
  const agent: Agent = {
    id: 'de9006e1-54a7-4320-b24e-927e6fe518a8',
    active: true,
    policy_id: '63a284b0-0334-11eb-a4e0-09883c57114b',
    type: 'PERMANENT',
    enrolled_at: '2020-09-30T20:24:08.347Z',
    user_provided_metadata: {},
    local_metadata: {
      elastic: {
        agent: {
          id: 'de9006e1-54a7-4320-b24e-927e6fe518a8',
          version,
          snapshot: false,
          'build.original':
            '8.0.0 (build: e2ef4fc375a5ece83d5d38f57b2977d7866b5819 at 2020-09-30 20:21:35 +0000 UTC)',
        },
      },
      host: {
        architecture: 'x86_64',
        hostname: 'Sandras-MBP.fios-router.home',
        name: 'Sandras-MBP.fios-router.home',
        id: '1112D0AD-526D-5268-8E86-765D35A0F484',
        ip: [
          '127.0.0.1/8',
          '::1/128',
          'fe80::1/64',
          'fe80::aede:48ff:fe00:1122/64',
          'fe80::4fc:2526:7d51:19cc/64',
          '192.168.1.161/24',
          'fe80::3083:5ff:fe30:4b00/64',
          'fe80::3083:5ff:fe30:4b00/64',
          'fe80::f7fb:518e:2c3c:7815/64',
          'fe80::2abd:20e3:9bc3:c054/64',
          'fe80::531a:20ab:1f38:7f9/64',
        ],
        mac: [
          'a6:83:e7:b0:1a:d2',
          'ac:de:48:00:11:22',
          'a4:83:e7:b0:1a:d2',
          '82:c5:c2:25:b0:01',
          '82:c5:c2:25:b0:00',
          '82:c5:c2:25:b0:05',
          '82:c5:c2:25:b0:04',
          '82:c5:c2:25:b0:01',
          '06:83:e7:b0:1a:d2',
          '32:83:05:30:4b:00',
          '32:83:05:30:4b:00',
        ],
      },
      os: {
        family: 'darwin',
        kernel: '19.4.0',
        platform: 'darwin',
        version: '10.15.4',
        name: 'Mac OS X',
        full: 'Mac OS X(10.15.4)',
      },
    },
    access_api_key_id: 'A_6v4HQBEEDXi-A9vxPE',
    default_api_key_id: 'BP6v4HQBEEDXi-A95xMk',
    policy_revision: 1,
    packages: ['system'],
    last_checkin: '2020-10-01T14:43:27.255Z',
    current_error_events: [],
    status: 'online',
  };
  if (upgradeable) {
    agent.local_metadata.elastic.agent.upgradeable = true;
  }
  if (unenrolling) {
    agent.unenrollment_started_at = '2020-10-01T14:43:27.255Z';
  }
  if (unenrolled) {
    agent.unenrolled_at = '2020-10-01T14:43:27.255Z';
  }
  return agent;
};
describe('Fleet - isAgentUpgradeable', () => {
  it('returns false if agent reports not upgradeable with agent version < kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '7.9.0' }), '8.0.0')).toBe(false);
  });
  it('returns false if agent reports not upgradeable with agent version > kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '8.0.0' }), '7.9.0')).toBe(false);
  });
  it('returns false if agent reports not upgradeable with agent version === kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '8.0.0' }), '8.0.0')).toBe(false);
  });
  it('returns false if agent reports upgradeable, with agent version === kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '8.0.0', upgradeable: true }), '8.0.0')).toBe(
      false
    );
  });
  it('returns false if agent reports upgradeable, with agent version > kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '8.0.0', upgradeable: true }), '7.9.0')).toBe(
      false
    );
  });
  it('returns false if agent reports upgradeable, but agent is unenrolling', () => {
    expect(
      isAgentUpgradeable(
        getAgent({ version: '7.9.0', upgradeable: true, unenrolling: true }),
        '8.0.0'
      )
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, but agent is unenrolled', () => {
    expect(
      isAgentUpgradeable(
        getAgent({ version: '7.9.0', upgradeable: true, unenrolled: true }),
        '8.0.0'
      )
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable, with agent version < kibana version', () => {
    expect(isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0')).toBe(
      true
    );
  });
  it('returns false if agent reports upgradeable, with agent snapshot version === kibana version', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0-SNAPSHOT', upgradeable: true }), '7.9.0')
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, with agent version === kibana snapshot version', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true }), '7.9.0-SNAPSHOT')
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable, with agent snapshot version < kibana snapshot version', () => {
    expect(
      isAgentUpgradeable(
        getAgent({ version: '7.9.0-SNAPSHOT', upgradeable: true }),
        '8.0.0-SNAPSHOT'
      )
    ).toBe(true);
  });
  it('returns false if agent reports upgradeable, with agent snapshot version === kibana snapshot version', () => {
    expect(
      isAgentUpgradeable(
        getAgent({ version: '8.0.0-SNAPSHOT', upgradeable: true }),
        '8.0.0-SNAPSHOT'
      )
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable, with agent version < kibana snapshot version', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0-SNAPSHOT')
    ).toBe(true);
  });
});
