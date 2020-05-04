/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shouldCreateConfigAction } from './checkin';
import { Agent } from '../../types';

function getAgent(data: Partial<Agent>) {
  return { actions: [], ...data } as Agent;
}

describe('Agent checkin service', () => {
  describe('shouldCreateConfigAction', () => {
    it('should return false if the agent do not have an assigned config', () => {
      const res = shouldCreateConfigAction(getAgent({}), []);

      expect(res).toBeFalsy();
    });

    it('should return true if this is agent first checkin', () => {
      const res = shouldCreateConfigAction(getAgent({ config_id: 'config1' }), []);

      expect(res).toBeTruthy();
    });

    it('should return false agent is already running latest revision', () => {
      const res = shouldCreateConfigAction(
        getAgent({
          config_id: 'config1',
          last_checkin: '2018-01-02T00:00:00',
          config_revision: 1,
          config_newest_revision: 1,
        }),
        []
      );

      expect(res).toBeFalsy();
    });

    it('should return false agent has already latest revision config change action', () => {
      const res = shouldCreateConfigAction(
        getAgent({
          config_id: 'config1',
          last_checkin: '2018-01-02T00:00:00',
          config_revision: 1,
          config_newest_revision: 2,
        }),
        [
          {
            id: 'action1',
            agent_id: 'agent1',
            type: 'CONFIG_CHANGE',
            created_at: new Date().toISOString(),
            data: {
              config: {
                id: 'config1',
                revision: 2,
              },
            },
          },
        ]
      );

      expect(res).toBeFalsy();
    });

    it('should return true agent has unrelated config change actions', () => {
      const res = shouldCreateConfigAction(
        getAgent({
          config_id: 'config1',
          last_checkin: '2018-01-02T00:00:00',
          config_revision: 1,
          config_newest_revision: 2,
        }),
        [
          {
            id: 'action1',
            agent_id: 'agent1',
            type: 'CONFIG_CHANGE',
            created_at: new Date().toISOString(),
            data: {
              config: {
                id: 'config2',
                revision: 2,
              },
            },
          },
          {
            id: 'action1',
            agent_id: 'agent1',
            type: 'CONFIG_CHANGE',
            created_at: new Date().toISOString(),
            data: {
              config: {
                id: 'config1',
                revision: 1,
              },
            },
          },
        ]
      );

      expect(res).toBeTruthy();
    });

    it('should return true if this agent has a new revision', () => {
      const res = shouldCreateConfigAction(
        getAgent({
          config_id: 'config1',
          last_checkin: '2018-01-02T00:00:00',
          config_revision: 1,
          config_newest_revision: 2,
        }),
        []
      );

      expect(res).toBeTruthy();
    });

    it('should return true if this agent has no revision currently set', () => {
      const res = shouldCreateConfigAction(
        getAgent({
          config_id: 'config1',
          last_checkin: '2018-01-02T00:00:00',
          config_revision: null,
          config_newest_revision: 2,
        }),
        []
      );

      expect(res).toBeTruthy();
    });
  });
});
