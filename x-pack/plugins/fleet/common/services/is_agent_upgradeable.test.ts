/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentUpgradeDetails } from '../types/models/agent';

import {
  getRecentUpgradeInfoForAgent,
  isAgentUpgradeable,
  isAgentUpgrading,
  getNotUpgradeableMessage,
  isAgentUpgradeAvailable,
  isAgentUpgradeableToVersion,
} from './is_agent_upgradeable';

const getAgent = ({
  version,
  upgradeable = false,
  unenrolling = false,
  unenrolled = false,
  upgrading = false,
  upgradeDetails,
  minutesSinceUpgrade,
}: {
  version: string;
  upgradeable?: boolean;
  unenrolling?: boolean;
  unenrolled?: boolean;
  upgrading?: boolean;
  upgradeDetails?: AgentUpgradeDetails;
  minutesSinceUpgrade?: number;
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
  if (upgrading) {
    agent.upgrade_started_at = new Date(Date.now()).toISOString();
  }
  if (upgradeDetails) {
    agent.upgrade_details = upgradeDetails;
  }
  if (minutesSinceUpgrade) {
    agent.upgraded_at = new Date(Date.now() - minutesSinceUpgrade * 6e4).toISOString();
  }
  return agent;
};
describe('Fleet - isAgentUpgradeAvailable', () => {
  it('returns false if agent reports not upgradeable with agent version < latest agent version', () => {
    expect(isAgentUpgradeAvailable(getAgent({ version: '7.9.0' }), '8.0.0')).toBe(false);
  });
  it('returns false if agent reports not upgradeable with agent version > latest agent version', () => {
    expect(isAgentUpgradeAvailable(getAgent({ version: '8.0.0' }), '7.9.0')).toBe(false);
  });
  it('returns false if agent reports not upgradeable with agent version === latest agent version', () => {
    expect(isAgentUpgradeAvailable(getAgent({ version: '8.0.0' }), '8.0.0')).toBe(false);
  });
  it('returns false if agent reports upgradeable, with agent version === latest agent version', () => {
    expect(
      isAgentUpgradeAvailable(getAgent({ version: '8.0.0', upgradeable: true }), '8.0.0')
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, with agent version > latest agent version', () => {
    expect(
      isAgentUpgradeAvailable(getAgent({ version: '8.0.0', upgradeable: true }), '7.9.0')
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable, with agent version < latest agent version', () => {
    expect(
      isAgentUpgradeAvailable(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0')
    ).toBe(true);
  });
  it('returns false if agent reports upgradeable, with agent snapshot version === latest agent version', () => {
    expect(
      isAgentUpgradeAvailable(getAgent({ version: '7.9.0-SNAPSHOT', upgradeable: true }), '7.9.0')
    ).toBe(false);
  });
});
describe('Fleet - isAgentUpgradeable', () => {
  it('returns false if agent reports upgradeable, but agent is unenrolling', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true, unenrolling: true }))
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, but agent is unenrolled', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true, unenrolled: true }))
    ).toBe(false);
  });
  it('returns false if agent with no upgrade details reports upgradeable, but is already upgrading', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true, upgrading: true }))
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, but has an upgrade status other than failed', () => {
    expect(
      isAgentUpgradeable(
        getAgent({
          version: '7.9.0',
          upgradeable: true,
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_REQUESTED',
          },
        })
      )
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable and has a failed upgrade status', () => {
    expect(
      isAgentUpgradeable(
        getAgent({
          version: '7.9.0',
          upgradeable: true,
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_FAILED',
            metadata: {
              error_msg: 'Upgrade timed out',
            },
          },
        })
      )
    ).toBe(true);
  });
  it('returns false if the agent reports upgradeable but was upgraded less than 10 minutes ago', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true, minutesSinceUpgrade: 9 }))
    ).toBe(false);
  });
  it('returns true if agent reports upgradeable and was upgraded more than 10 minutes ago', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '7.9.0', upgradeable: true, minutesSinceUpgrade: 11 }))
    ).toBe(true);
  });
  it('returns false if the agent reports upgradeable but is in watching state', () => {
    expect(
      isAgentUpgradeable(
        getAgent({
          version: '8.12.0',
          upgradeable: true,
          minutesSinceUpgrade: 11,
          upgradeDetails: { state: 'UPG_WATCHING' } as any,
        })
      )
    ).toBe(false);
  });
  it('returns true if agent watching state cleared and it was upgraded less than 10 minutes ago', () => {
    expect(
      isAgentUpgradeable(getAgent({ version: '8.12.1', upgradeable: true, minutesSinceUpgrade: 1 }))
    ).toBe(true);
  });
});
describe('Fleet - isAgentUpgradeableToVersion', () => {
  it('returns true if agent reports upgradeable, with upgrade to agent snapshot version newer than latest agent version', () => {
    expect(
      isAgentUpgradeableToVersion(
        getAgent({ version: '8.10.2', upgradeable: true }),
        '8.11.0-SNAPSHOT'
      )
    ).toBe(true);
  });
  it('returns false if agent reports upgradeable, with target version < current agent version ', () => {
    expect(
      isAgentUpgradeableToVersion(getAgent({ version: '7.9.0', upgradeable: true }), '7.8.0')
    ).toBe(false);
  });
  it('returns false if agent reports upgradeable, with target version == current agent version ', () => {
    expect(
      isAgentUpgradeableToVersion(getAgent({ version: '7.9.0', upgradeable: true }), '7.9.0')
    ).toBe(false);
  });
});

describe('Fleet - getNotUpgradeableMessage', () => {
  it('if agent reports not upgradeable with agent version < latest agent version', () => {
    expect(getNotUpgradeableMessage(getAgent({ version: '7.9.0' }), '8.0.0')).toBe(
      'agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service.'
    );
  });

  it('if agent reports not upgradeable with agent version > latest agent version', () => {
    expect(getNotUpgradeableMessage(getAgent({ version: '8.0.0' }), '7.9.0')).toBe(
      'agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service.'
    );
  });

  it('returns false if agent reports not upgradeable with agent version === latest agent version', () => {
    expect(getNotUpgradeableMessage(getAgent({ version: '8.0.0' }), '8.0.0')).toBe(
      'agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service.'
    );
  });

  it('if agent reports upgradeable, with agent version === latest agent version', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '8.0.0', upgradeable: true }), '8.0.0')
    ).toBe(undefined);
  });

  it('if agent reports upgradeable, with agent version > latest agent version', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '8.0.0', upgradeable: true }), '7.9.0')
    ).toBe('agent is running on a version greater than the latest available version.');
  });

  it('if agent reports upgradeable, but agent is unenrolling', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '7.9.0', upgradeable: true, unenrolling: true }),
        '8.0.0'
      )
    ).toBe('agent is being unenrolled.');
  });

  it('if agent reports upgradeable, but agent is unenrolled', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '7.9.0', upgradeable: true, unenrolled: true }),
        '8.0.0'
      )
    ).toBe('agent has been unenrolled.');
  });

  it('Returns no error message if agent reports upgradeable, with agent version < latest agent version', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0')
    ).toBeUndefined();
  });

  it('if agent reports upgradeable, with agent snapshot version === latest agent version', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '7.9.0-SNAPSHOT', upgradeable: true }), '7.9.0')
    ).toBe(undefined);
  });

  it('it does not return message if agent reports upgradeable, with upgrade to agent snapshot version newer than latest agent version', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '8.10.2', upgradeable: true }),
        '8.10.2',
        '8.11.0-SNAPSHOT'
      )
    ).toBeUndefined();
  });

  it('if agent reports upgradeable, with target version < current agent version ', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0', '7.8.0')
    ).toBe('agent does not support downgrades.');
  });

  it('if agent reports upgradeable, with target version == current agent version ', () => {
    expect(
      getNotUpgradeableMessage(getAgent({ version: '7.9.0', upgradeable: true }), '8.0.0', '7.9.0')
    ).toBe('agent is already running on the selected version.');
  });

  it('if agent with no upgrade details reports upgradeable, but is already upgrading', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '7.9.0', upgradeable: true, upgrading: true }),
        '8.0.0'
      )
    ).toBe('agent is already being upgraded.');
  });

  it('if agent reports upgradeable, but has an upgrade status other than failed', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({
          version: '7.9.0',
          upgradeable: true,
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_REQUESTED',
          },
        }),
        '8.0.0'
      )
    ).toBe('agent is already being upgraded.');
  });

  it('it does not return a message if agent reports upgradeable and has a failed upgrade status', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({
          version: '7.9.0',
          upgradeable: true,
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_FAILED',
            metadata: {
              error_msg: 'Upgrade timed out',
            },
          },
        }),
        '8.0.0'
      )
    ).toBeUndefined();
  });

  it('if the agent reports upgradeable but was upgraded less than 10 minutes ago', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '7.9.0', upgradeable: true, minutesSinceUpgrade: 9 }),
        '8.0.0'
      )
    ).toContain('please wait');
  });

  it('if agent reports upgradeable and was upgraded more than 10 minutes ago', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({ version: '7.9.0', upgradeable: true, minutesSinceUpgrade: 11 }),
        '8.0.0'
      )
    ).toBeUndefined();
  });

  it('if the agent reports upgradeable but is in watching state', () => {
    expect(
      getNotUpgradeableMessage(
        getAgent({
          version: '8.12.0',
          upgradeable: true,
          minutesSinceUpgrade: 11,
          upgradeDetails: { state: 'UPG_WATCHING' } as any,
        })
      )
    ).toContain(
      'agent was recently ugraded and is being monitored. Please wait until the monitoring state is cleared.'
    );
  });
});

describe('hasAgentBeenUpgradedRecently', () => {
  it('returns true if the agent was upgraded less than 10 minutes ago', () => {
    expect(
      getRecentUpgradeInfoForAgent(getAgent({ version: '7.9.0', minutesSinceUpgrade: 9 }))
        .hasBeenUpgradedRecently
    ).toBe(true);
  });

  it('returns false if the agent was upgraded more than 10 minutes ago', () => {
    expect(
      getRecentUpgradeInfoForAgent(getAgent({ version: '7.9.0', minutesSinceUpgrade: 11 }))
        .hasBeenUpgradedRecently
    ).toBe(false);
  });

  it('returns false if the agent does not have an upgrade_at field', () => {
    expect(
      getRecentUpgradeInfoForAgent(getAgent({ version: '7.9.0' })).hasBeenUpgradedRecently
    ).toBe(false);
  });

  it('returns false if the agent was upgraded more less 10 minutes ago, but supports upgrade details', () => {
    expect(
      getRecentUpgradeInfoForAgent(getAgent({ version: '8.12.0', minutesSinceUpgrade: 1 }))
        .hasBeenUpgradedRecently
    ).toBe(false);
  });
});

describe('isAgentUpgrading', () => {
  it('returns true if the agent has an upgrade status other than failed', () => {
    expect(
      isAgentUpgrading(
        getAgent({
          version: '7.9.0',
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_REQUESTED',
          },
        })
      )
    ).toBe(true);
  });

  it('returns false if the agent has a failed upgrade status', () => {
    expect(
      isAgentUpgrading(
        getAgent({
          version: '7.9.0',
          upgradeDetails: {
            target_version: '8.0.0',
            action_id: 'XXX',
            state: 'UPG_FAILED',
            metadata: {
              error_msg: 'Upgrade timed out',
            },
          },
        })
      )
    ).toBe(false);
  });

  it('returns true if the agent is upgrading but has no upgrade details', () => {
    expect(
      isAgentUpgrading(
        getAgent({
          version: '7.9.0',
          upgrading: true,
        })
      )
    ).toBe(true);
  });
});
