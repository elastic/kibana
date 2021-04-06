/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiHealth, EuiHighlight } from '@elastic/eui';

import { useAllAgents } from './use_all_agents';
import { useAgentGroups } from './use_agent_groups';
import { useOsqueryPolicies } from './use_osquery_policies';
import { Agent } from '../../common/shared_imports';
import {
  getNumAgentsInGrouping,
  generateAgentCheck,
  getNumOverlapped,
  generateColorPicker,
} from './helpers';

import {
  ALL_AGENTS_LABEL,
  AGENT_PLATFORMS_LABEL,
  AGENT_POLICY_LABEL,
  SELECT_AGENT_LABEL,
  AGENT_SELECTION_LABEL,
  generateSelectedAgentsMessage,
} from './translations';

import { AGENT_GROUP_KEY, SelectedGroups, AgentOptionValue, GroupOptionValue } from './types';

export interface AgentsSelection {
  agents: string[];
  allAgentsSelected: boolean;
  platformsSelected: string[];
  policiesSelected: string[];
}

interface AgentsTableProps {
  agentSelection: AgentsSelection;
  onChange: (payload: AgentsSelection) => void;
}

type GroupOption = EuiComboBoxOptionOption<AgentOptionValue | GroupOptionValue>;

const getColor = generateColorPicker();

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ onChange }) => {
  const osqueryPolicyData = useOsqueryPolicies();
  const { loading: groupsLoading, totalCount: totalNumAgents, groups } = useAgentGroups(
    osqueryPolicyData
  );
  const { agents } = useAllAgents(osqueryPolicyData);
  const [loading, setLoading] = useState<boolean>(true);
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<GroupOption[]>([]);
  const [numAgentsSelected, setNumAgentsSelected] = useState<number>(0);

  useEffect(() => {
    const allAgentsLabel = ALL_AGENTS_LABEL;
    const opts: GroupOption[] = [
      {
        label: allAgentsLabel,
        options: [
          {
            label: allAgentsLabel,
            value: { groupType: AGENT_GROUP_KEY.All, size: totalNumAgents },
            color: getColor(AGENT_GROUP_KEY.All),
          },
        ],
      },
    ];

    if (groups.platforms.length > 0) {
      const groupType = AGENT_GROUP_KEY.Platform;
      opts.push({
        label: AGENT_PLATFORMS_LABEL,
        options: groups.platforms.map(({ name, size }) => ({
          label: name,
          color: getColor(groupType),
          value: { groupType, size },
        })),
      });
    }

    if (groups.policies.length > 0) {
      const groupType = AGENT_GROUP_KEY.Policy;
      opts.push({
        label: AGENT_POLICY_LABEL,
        options: groups.policies.map(({ name, size }) => ({
          label: name,
          color: getColor(groupType),
          value: { groupType, size },
        })),
      });
    }

    if (agents && agents.length > 0) {
      const groupType = AGENT_GROUP_KEY.Agent;
      opts.push({
        label: AGENT_SELECTION_LABEL,
        options: (agents as Agent[]).map((agent: Agent) => ({
          label: agent.local_metadata.host.hostname,
          color: getColor(groupType),
          value: {
            groupType,
            groups: { policy: agent.policy_id ?? '', platform: agent.local_metadata.os.platform },
            id: agent.local_metadata.elastic.agent.id,
            online: agent.active,
          },
        })),
      });
    }
    setLoading(false);
    setOptions(opts);
  }, [groups.platforms, groups.policies, totalNumAgents, groupsLoading, agents]);

  const onSelection = useCallback(
    (selection: GroupOption[]) => {
      // TODO?: optimize this by making it incremental
      const newAgentSelection: AgentsSelection = {
        agents: [],
        allAgentsSelected: false,
        platformsSelected: [],
        policiesSelected: [],
      };
      // parse through the selections to be able to determine how many are actually selected
      const selectedAgents = [];
      const selectedGroups: SelectedGroups = {
        policy: {},
        platform: {},
      };

      // TODO: clean this up, make it less awkward
      for (const opt of selection) {
        const groupType = opt.value?.groupType;
        let value;
        switch (groupType) {
          case AGENT_GROUP_KEY.All:
            newAgentSelection.allAgentsSelected = true;
            break;
          case AGENT_GROUP_KEY.Platform:
            value = opt.value as GroupOptionValue;
            if (!newAgentSelection.allAgentsSelected) {
              // we don't need to calculate diffs when all agents are selected
              selectedGroups.platform[opt.label] = value.size;
            }
            newAgentSelection.platformsSelected.push(opt.label);
            break;
          case AGENT_GROUP_KEY.Policy:
            value = opt.value as GroupOptionValue;
            if (!newAgentSelection.allAgentsSelected) {
              // we don't need to calculate diffs when all agents are selected
              selectedGroups.policy[opt.label] = value.size ?? 0;
            }
            newAgentSelection.policiesSelected.push(opt.label);
            break;
          case AGENT_GROUP_KEY.Agent:
            value = opt.value as AgentOptionValue;
            if (!newAgentSelection.allAgentsSelected) {
              // we don't need to count how many agents are selected if they are all selected
              selectedAgents.push(opt.value);
            }
            // TODO: fix this casting by updating the opt type to be a union
            newAgentSelection.agents.push(value.id as string);
            break;
          default:
            // this should never happen!
            // eslint-disable-next-line no-console
            console.error(`unknown group type ${groupType}`);
        }
      }
      if (newAgentSelection.allAgentsSelected) {
        setNumAgentsSelected(totalNumAgents);
      } else {
        const checkAgent = generateAgentCheck(selectedGroups);
        setNumAgentsSelected(
          // filter out all the agents counted by selected policies and platforms
          selectedAgents.filter((a) => checkAgent(a as AgentOptionValue)).length +
            // add the number of agents added via policy and platform groups
            getNumAgentsInGrouping(selectedGroups) -
            // subtract the number of agents double counted by policy/platform selections
            getNumOverlapped(selectedGroups, groups.overlap)
        );
      }
      onChange(newAgentSelection);
      setSelectedOptions(selection);
    },
    [groups, onChange, totalNumAgents]
  );

  const renderOption = useCallback((option, searchValue, contentClassName) => {
    const { label, value } = option;
    return value?.groupType === AGENT_GROUP_KEY.Agent ? (
      <EuiHealth color={value?.online ? 'success' : 'danger'}>
        <span className={contentClassName}>
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        </span>
      </EuiHealth>
    ) : (
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        &nbsp;
        <span>({value?.size})</span>
      </span>
    );
  }, []);
  return (
    <div>
      <h2>{SELECT_AGENT_LABEL}</h2>
      {numAgentsSelected > 0 ? <span>{generateSelectedAgentsMessage(numAgentsSelected)}</span> : ''}
      &nbsp;
      <EuiComboBox
        placeholder="Select or create options"
        isLoading={loading}
        options={options}
        fullWidth={true}
        selectedOptions={selectedOptions}
        onChange={onSelection}
        renderOption={renderOption}
      />
    </div>
  );
};

export const AgentsTable = React.memo(AgentsTableComponent);
