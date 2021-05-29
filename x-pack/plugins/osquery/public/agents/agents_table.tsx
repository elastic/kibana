/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiComboBox, EuiHealth, EuiHighlight, EuiSpacer } from '@elastic/eui';

import useDebounce from 'react-use/lib/useDebounce';
import { useAllAgents } from './use_all_agents';
import { useAgentGroups } from './use_agent_groups';
import { useOsqueryPolicies } from './use_osquery_policies';
import { AgentGrouper } from './agent_grouper';
import {
  getNumAgentsInGrouping,
  generateAgentCheck,
  getNumOverlapped,
  generateAgentSelection,
} from './helpers';

import { SELECT_AGENT_LABEL, generateSelectedAgentsMessage } from './translations';

import {
  AGENT_GROUP_KEY,
  SelectedGroups,
  AgentOptionValue,
  GroupOption,
  AgentSelection,
} from './types';

interface AgentsTableProps {
  agentSelection: AgentSelection;
  onChange: (payload: AgentSelection) => void;
}

const perPage = 10;
const DEBOUNCE_DELAY = 100; // ms

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ agentSelection, onChange }) => {
  // search related
  const [searchValue, setSearchValue] = useState<string>('');
  const [modifyingSearch, setModifyingSearch] = useState<boolean>(false);
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>('');
  useDebounce(
    () => {
      // update the real search value, set the typing flag
      setDebouncedSearchValue(searchValue);
      setModifyingSearch(false);
    },
    DEBOUNCE_DELAY,
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
  });

  // option related
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<GroupOption[]>([]);
  const [numAgentsSelected, setNumAgentsSelected] = useState<number>(0);
  const defaultValueInitialized = useRef(false);

  useEffect(() => {
    if (agentSelection && !defaultValueInitialized.current && options.length) {
      if (agentSelection.policiesSelected) {
        const policyOptions = find(['label', 'Policy'], options);

        if (policyOptions) {
          const defaultOptions = policyOptions.options?.filter((option) =>
            agentSelection.policiesSelected.includes(option.label)
          );

          if (defaultOptions?.length) {
            setSelectedOptions(defaultOptions);
          }
          defaultValueInitialized.current = true;
        }
      }
    }
  }, [agentSelection, options]);

  useEffect(() => {
    // update the groups when groups or agents have changed
    grouper.setTotalAgents(totalNumAgents);
    grouper.updateGroup(AGENT_GROUP_KEY.Platform, groups.platforms);
    grouper.updateGroup(AGENT_GROUP_KEY.Policy, groups.policies);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    grouper.updateGroup(AGENT_GROUP_KEY.Agent, agents!);
    const newOptions = grouper.generateOptions();
    setOptions(newOptions);
  }, [groups.platforms, groups.policies, totalNumAgents, groupsLoading, agents, grouper]);

  const onSelection = useCallback(
    (selection: GroupOption[]) => {
      // TODO?: optimize this by making the selection computation incremental
      const {
        newAgentSelection,
        selectedAgents,
        selectedGroups,
      }: {
        newAgentSelection: AgentSelection;
        selectedAgents: AgentOptionValue[];
        selectedGroups: SelectedGroups;
      } = generateAgentSelection(selection);
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

  const renderOption = useCallback((option, searchVal, contentClassName) => {
    const { label, value } = option;
    return value?.groupType === AGENT_GROUP_KEY.Agent ? (
      <EuiHealth color={value?.status === 'online' ? 'success' : 'danger'}>
        <span className={contentClassName}>
          <EuiHighlight search={searchVal}>{label}</EuiHighlight>
        </span>
      </EuiHealth>
    ) : (
      <span className={contentClassName}>
        <span>[{value?.size ?? 0}]</span>
        &nbsp;
        <EuiHighlight search={searchVal}>{label}</EuiHighlight>
      </span>
    );
  }, []);

  const onSearchChange = useCallback((v: string) => {
    // set the typing flag and update the search value
    setModifyingSearch(v !== '');
    setSearchValue(v);
  }, []);

  return (
    <div>
      <EuiComboBox
        placeholder={SELECT_AGENT_LABEL}
        isLoading={modifyingSearch || groupsLoading || agentsLoading}
        options={options}
        isClearable={true}
        fullWidth={true}
        onSearchChange={onSearchChange}
        selectedOptions={selectedOptions}
        onChange={onSelection}
        renderOption={renderOption}
      />
      <EuiSpacer size="xs" />
      {numAgentsSelected > 0 ? <span>{generateSelectedAgentsMessage(numAgentsSelected)}</span> : ''}
    </div>
  );
};

export const AgentsTable = React.memo(AgentsTableComponent);
