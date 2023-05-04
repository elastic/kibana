/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiComboBox, EuiHealth, EuiFormRow, EuiHighlight, EuiSpacer } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';

import useDebounce from 'react-use/lib/useDebounce';
import { useAllAgents } from './use_all_agents';
import { useAgentGroups } from './use_agent_groups';
import { AgentGrouper } from './agent_grouper';
import {
  getNumAgentsInGrouping,
  generateAgentCheck,
  getNumOverlapped,
  generateAgentSelection,
} from './helpers';

import {
  SELECT_AGENT_LABEL,
  generateSelectedAgentsMessage,
  ALL_AGENTS_LABEL,
  AGENT_POLICY_LABEL,
  AGENT_SELECTION_LABEL,
} from './translations';

import type { SelectedGroups, AgentOptionValue, GroupOption, AgentSelection } from './types';
import { AGENT_GROUP_KEY } from './types';

interface AgentsTableProps {
  agentSelection: AgentSelection;
  onChange: (payload: AgentSelection) => void;
  error?: string;
}

const perPage = 10;
const DEBOUNCE_DELAY = 300; // ms

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ agentSelection, onChange, error }) => {
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
  const {
    isLoading: groupsLoading,
    data: agentGroupsData,
    isFetched: groupsFetched,
  } = useAgentGroups();
  const {
    isLoading: agentsLoading,
    data: agents,
    isFetched: agentsFetched,
  } = useAllAgents(debouncedSearchValue, {
    perPage,
  });

  // option related
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<GroupOption[]>([]);
  const [numAgentsSelected, setNumAgentsSelected] = useState<number>(0);
  const defaultValueInitialized = useRef(false);

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
        setNumAgentsSelected(agentGroupsData?.total ?? 0);
      } else {
        const checkAgent = generateAgentCheck(selectedGroups);
        setNumAgentsSelected(
          // filter out all the agents counted by selected policies and platforms
          selectedAgents.filter(checkAgent).length +
            // add the number of agents added via policy and platform groups
            getNumAgentsInGrouping(selectedGroups) -
            // subtract the number of agents double counted by policy/platform selections
            getNumOverlapped(selectedGroups, agentGroupsData?.groups?.overlap ?? {})
        );
      }

      onChange(newAgentSelection);
      setSelectedOptions(selection);
    },
    [agentGroupsData, onChange]
  );

  useEffect(() => {
    const handleSelectedOptions = (selection: string[], label: string) => {
      const agentOptions = find(['label', label], options);

      if (agentOptions) {
        const defaultOptions = agentOptions.options?.filter((option) => {
          if (option.key) {
            return selection.includes(option.key);
          }
        });

        if (defaultOptions?.length) {
          onSelection(defaultOptions);
          defaultValueInitialized.current = true;
        }
      }
    };

    if (agentSelection && !defaultValueInitialized.current && options.length) {
      if (agentSelection.allAgentsSelected) {
        const allAgentsOptions = find(['label', ALL_AGENTS_LABEL], options);

        if (allAgentsOptions?.options) {
          onSelection(allAgentsOptions.options);
          defaultValueInitialized.current = true;
        }
      }

      if (agentSelection.policiesSelected?.length) {
        handleSelectedOptions(agentSelection.policiesSelected, AGENT_POLICY_LABEL);
      }

      if (agentSelection.agents?.length) {
        handleSelectedOptions(agentSelection.agents, AGENT_SELECTION_LABEL);
      }
    }
  }, [agentSelection, onSelection, options, selectedOptions]);

  useEffect(() => {
    if (agentsFetched && groupsFetched && agentGroupsData) {
      const grouper = new AgentGrouper();
      // update the groups when groups or agents have changed
      grouper.setTotalAgents(agentGroupsData?.total);
      grouper.updateGroup(AGENT_GROUP_KEY.Platform, agentGroupsData?.groups.platforms);
      grouper.updateGroup(AGENT_GROUP_KEY.Policy, agentGroupsData?.groups.policies);
      // @ts-expect-error update types
      grouper.updateGroup(AGENT_GROUP_KEY.Agent, agents);
      const newOptions = grouper.generateOptions();
      setOptions((prevOptions) => (!deepEqual(prevOptions, newOptions) ? newOptions : prevOptions));
    }
  }, [groupsLoading, agents, agentsFetched, groupsFetched, agentGroupsData]);

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
      <EuiFormRow label={AGENT_SELECTION_LABEL} fullWidth isInvalid={!!error} error={error}>
        <EuiComboBox
          data-test-subj="agentSelection"
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
      </EuiFormRow>
      <EuiSpacer size="xs" />
      {numAgentsSelected > 0 ? <span>{generateSelectedAgentsMessage(numAgentsSelected)}</span> : ''}
    </div>
  );
};

AgentsTableComponent.displayName = 'AgentsTable';

export const AgentsTable = React.memo(AgentsTableComponent, deepEqual);
