/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from '../../common/shared_imports';
import { generateColorPicker } from './helpers';
import {
  ALL_AGENTS_LABEL,
  AGENT_PLATFORMS_LABEL,
  AGENT_POLICY_LABEL,
  AGENT_SELECTION_LABEL,
} from './translations';
import { AGENT_GROUP_KEY, Group, GroupOption } from './types';

const getColor = generateColorPicker();

const generateGroup = <T = Group>(label: string, groupType: AGENT_GROUP_KEY) => {
  return {
    label,
    groupType,
    color: getColor(groupType),
    size: 0,
    data: [] as T[],
  };
};

export class AgentGrouper {
  groupOrder = [
    AGENT_GROUP_KEY.All,
    AGENT_GROUP_KEY.Platform,
    AGENT_GROUP_KEY.Policy,
    AGENT_GROUP_KEY.Agent,
  ];
  groups = {
    [AGENT_GROUP_KEY.All]: generateGroup(ALL_AGENTS_LABEL, AGENT_GROUP_KEY.All),
    [AGENT_GROUP_KEY.Platform]: generateGroup(AGENT_PLATFORMS_LABEL, AGENT_GROUP_KEY.Platform),
    [AGENT_GROUP_KEY.Policy]: generateGroup(AGENT_POLICY_LABEL, AGENT_GROUP_KEY.Policy),
    [AGENT_GROUP_KEY.Agent]: generateGroup<Agent>(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateGroup(key: AGENT_GROUP_KEY, data: any[], append = false) {
    if (!data?.length) {
      return;
    }
    const group = this.groups[key];
    if (append) {
      group.data.push(...data);
    } else {
      group.data = data;
    }
    group.size = data.length;
  }

  setTotalAgents(total: number): void {
    this.groups[AGENT_GROUP_KEY.All].size = total;
  }

  generateOptions(): GroupOption[] {
    const opts: GroupOption[] = [];
    for (const key of this.groupOrder) {
      const { label, size, groupType, data, color } = this.groups[key];
      if (size === 0) {
        continue;
      }

      switch (key) {
        case AGENT_GROUP_KEY.All:
          opts.push({
            label,
            options: [
              {
                label,
                value: { groupType, size },
                color,
              },
            ],
          });
          break;
        case AGENT_GROUP_KEY.Platform:
        case AGENT_GROUP_KEY.Policy:
          opts.push({
            label,
            options: (data as Group[]).map(({ name, id, size: groupSize }) => ({
              label: name !== id ? `${name} (${id})` : name,
              key: id,
              color: getColor(groupType),
              value: { groupType, id, size: groupSize },
            })),
          });
          break;
        case AGENT_GROUP_KEY.Agent:
          opts.push({
            label,
            options: (data as Agent[]).map((agent: Agent) => ({
              label: `${agent.local_metadata.host.hostname} (${agent.local_metadata.elastic.agent.id})`,
              key: agent.local_metadata.elastic.agent.id,
              color,
              value: {
                groupType,
                groups: {
                  policy: agent.policy_id ?? '',
                  platform: agent.local_metadata.os.platform,
                },
                id: agent.local_metadata.elastic.agent.id,
                online: agent.active,
              },
            })),
          });
          break;
      }
    }
    return opts;
  }
}
