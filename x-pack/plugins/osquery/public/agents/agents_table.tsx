/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiHealth, EuiHighlight } from '@elastic/eui';

import { useDebounce } from 'react-use';
import { useAllAgents } from './use_all_agents';
import { useAgentGroups } from './use_agent_groups';
import { useOsqueryPolicies } from './use_osquery_policies';
import { AgentGrouper } from './agent_grouper';
import { getNumAgentsInGrouping, generateAgentCheck, getNumOverlapped } from './helpers';

import { SELECT_AGENT_LABEL, generateSelectedAgentsMessage } from './translations';

import {
  AGENT_GROUP_KEY,
  SelectedGroups,
  AgentOptionValue,
  GroupOptionValue,
  GroupOption,
} from './types';

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

const perPage = 10;

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ onChange }) => {
  // search related
  const [searchValue, setSearchValue] = useState<string>('');
  const [modifyingSearch, setModifyingSearch] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>('');
  useDebounce(
    () => {
      // reset the page, update the real search value, set the typing flag
      setPage(1);
      setDebouncedSearchValue(searchValue);
      setModifyingSearch(false);
    },
    100,
    [searchValue]
  );

  // grouping related
  const osqueryPolicyData = useOsqueryPolicies();
  const { loading: groupsLoading, totalCount: totalNumAgents, groups } = useAgentGroups(
    osqueryPolicyData
  );
  const grouper = useMemo(() => new AgentGrouper(), []);
  const { agentsLoading, agents } = useAllAgents(osqueryPolicyData, debouncedSearchValue, {
    perPage,
    page,
  });

  // option related
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [lastLabel, setLastLabel] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<GroupOption[]>([]);
  const [numAgentsSelected, setNumAgentsSelected] = useState<number>(0);

  useEffect(() => {
    // update the groups when groups or agents have changed
    grouper.setTotalAgents(totalNumAgents);
    grouper.updateGroup(AGENT_GROUP_KEY.Platform, groups.platforms);
    grouper.updateGroup(AGENT_GROUP_KEY.Policy, groups.policies);
    grouper.updateGroup(AGENT_GROUP_KEY.Agent, agents, page > 1);
    const newOptions = grouper.generateOptions();
    setOptions(newOptions);
    if (newOptions.length) {
      const lastGroup = newOptions[newOptions.length - 1].options;
      if (lastGroup?.length) {
        setLastLabel(lastGroup[lastGroup.length - 1].label);
      }
    }
  }, [groups.platforms, groups.policies, totalNumAgents, groupsLoading, agents, page, grouper]);

  const onSelection = useCallback(
    (selection: GroupOption[]) => {
      // TODO?: optimize this by making the selection computation incremental
      const newAgentSelection: AgentsSelection = {
        agents: [],
        allAgentsSelected: false,
        platformsSelected: [],
        policiesSelected: [],
      };
      // parse through the selections to be able to determine how many are actually selected
      const selectedAgents: AgentOptionValue[] = [];
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
              selectedGroups.platform[opt.value?.id ?? opt.label] = value.size;
            }
            newAgentSelection.platformsSelected.push(opt.label);
            break;
          case AGENT_GROUP_KEY.Policy:
            value = opt.value as GroupOptionValue;
            if (!newAgentSelection.allAgentsSelected) {
              // we don't need to calculate diffs when all agents are selected
              selectedGroups.policy[opt.value?.id ?? opt.label] = value.size;
            }
            newAgentSelection.policiesSelected.push(opt.label);
            break;
          case AGENT_GROUP_KEY.Agent:
            value = opt.value as AgentOptionValue;
            if (!newAgentSelection.allAgentsSelected) {
              // we don't need to count how many agents are selected if they are all selected
              selectedAgents.push(value);
            }
            if (value?.id) {
              newAgentSelection.agents.push(value.id);
            }
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
          selectedAgents.filter(checkAgent).length +
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

  const renderOption = useCallback(
    (option, searchVal, contentClassName) => {
      const { label, value, key } = option;
      if (label === lastLabel) {
        setPage((p) => p + 1);
      }
      return value?.groupType === AGENT_GROUP_KEY.Agent ? (
        <EuiHealth color={value?.online ? 'success' : 'danger'}>
          <span className={contentClassName}>
            <EuiHighlight search={searchVal}>{label}</EuiHighlight>
            &nbsp;
            <span>({key})</span>
          </span>
        </EuiHealth>
      ) : (
        <span className={contentClassName}>
          <span>[{value?.size}]</span>
          &nbsp;
          <EuiHighlight search={searchVal}>{label}</EuiHighlight>
          &nbsp;
          {value?.id && label !== value?.id && <span>({value?.id})</span>}
        </span>
      );
    },
    [lastLabel]
  );

  const onSearchChange = useCallback((v: string) => {
    // set the typing flag and update the search value
    setModifyingSearch(true);
    setSearchValue(v);
  }, []);

  return (
    <div>
      {numAgentsSelected > 0 ? <span>{generateSelectedAgentsMessage(numAgentsSelected)}</span> : ''}
      &nbsp;
      <EuiComboBox
        placeholder={SELECT_AGENT_LABEL}
        isLoading={modifyingSearch || groupsLoading || agentsLoading}
        options={options}
        fullWidth={true}
        onSearchChange={onSearchChange}
        selectedOptions={selectedOptions}
        onChange={onSelection}
        renderOption={renderOption}
      />
    </div>
  );
};

export const AgentsTable = React.memo(AgentsTableComponent);
