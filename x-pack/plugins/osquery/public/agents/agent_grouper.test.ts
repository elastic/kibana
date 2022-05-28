/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentGrouper } from './agent_grouper';
import { AGENT_GROUP_KEY, Group, GroupedAgent, GroupOptionValue } from './types';
import uuid from 'uuid';
import { ALL_AGENTS_LABEL } from './translations';

type GroupData = {
  [key in Exclude<AGENT_GROUP_KEY, AGENT_GROUP_KEY.All | AGENT_GROUP_KEY.Agent>]: Group[];
};
export function genGroup(name: string) {
  return {
    name,
    id: uuid.v4(),
    size: 5,
  };
}

export function genAgent(policyId: string, hostname: string, id: string): GroupedAgent {
  return {
    status: 'online',
    policy_id: policyId,
    local_metadata: {
      elastic: {
        agent: {
          id,
        },
      },
      os: {
        platform: 'test platform',
      },
      host: {
        hostname,
      },
    },
  };
}

export const groupData: GroupData = {
  [AGENT_GROUP_KEY.Platform]: new Array(3).fill('test platform ').map((el, i) => genGroup(el + i)),
  [AGENT_GROUP_KEY.Policy]: new Array(3).fill('test policy ').map((el, i) => genGroup(el + i)),
};

describe('AgentGrouper', () => {
  describe('All agents', () => {
    it('should handle empty groups properly', () => {
      const agentGrouper = new AgentGrouper();
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should ignore calls to add things to the "all" group', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.updateGroup(AGENT_GROUP_KEY.All, [{}]);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should omit the "all agents" option when total is set to <= 0', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.setTotalAgents(0);
      expect(agentGrouper.generateOptions()).toEqual([]);
      agentGrouper.setTotalAgents(-1);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should add the "all agents" option when the total is set to > 0', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.setTotalAgents(100);
      const groups = agentGrouper.generateOptions();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const allGroup = groups[AGENT_GROUP_KEY.All].options![0];
      expect(allGroup.label).toEqual(ALL_AGENTS_LABEL);
      const size: number = (allGroup.value as GroupOptionValue).size;

      expect(size).toEqual(100);
      agentGrouper.setTotalAgents(0);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });
  });

  describe('Policies and platforms', () => {
    function genGroupTest(
      key: AGENT_GROUP_KEY.Platform | AGENT_GROUP_KEY.Policy,
      dataName: string
    ) {
      return () => {
        const agentGrouper = new AgentGrouper();
        const data = groupData[key];
        agentGrouper.updateGroup(key, data);

        const groups = agentGrouper.generateOptions();
        const options = groups[0].options;
        expect(options).toBeTruthy();

        data.forEach((datum, i) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const opt = options![i];
          expect(opt.label).toEqual(`test ${dataName} ${i} (${datum.id})`);
          expect(opt.key).toEqual(datum.id);
          expect(opt.value).toEqual({
            groupType: key,
            id: datum.id,
            size: 5,
          });
        });
      };
    }

    it('should generate policy options', genGroupTest(AGENT_GROUP_KEY.Policy, 'policy'));
    it('should generate platform options', genGroupTest(AGENT_GROUP_KEY.Platform, 'platform'));
  });

  describe('agents', () => {
    it('should generate agent options', () => {
      const agentGrouper = new AgentGrouper();
      const policyId = uuid.v4();
      const agentData: GroupedAgent[] = [
        genAgent(policyId, `agent host 1`, uuid.v4()),
        genAgent(policyId, `agent host 2`, uuid.v4()),
      ];
      agentGrouper.updateGroup(AGENT_GROUP_KEY.Agent, agentData);

      const groups = agentGrouper.generateOptions();
      const options = groups[0].options;
      expect(options).toBeTruthy();
      agentData.forEach((ag, i) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const opt = options![i];
        expect(opt.label).toEqual(
          `${ag.local_metadata.host.hostname} (${ag.local_metadata.elastic.agent.id})`
        );
        expect(opt.key).toEqual(ag.local_metadata.elastic.agent.id);
        expect(opt.value?.id).toEqual(ag.local_metadata.elastic.agent.id);
      });
    });
  });
});
