/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  EuiComboBox,
  EuiHealth,
  EuiFormRow,
  EuiHighlight,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';

import useDebounce from 'react-use/lib/useDebounce';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../common/lib/kibana';
import { useAllAgents } from './use_all_agents';

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
  NO_AGENT_AVAILABLE_TITLE,
} from './translations';

import type { GroupOption, AgentSelection } from './types';
import { AGENT_GROUP_KEY } from './types';

interface AgentsTableProps {
  agentSelection: AgentSelection;
  onChange: (payload: AgentSelection) => void;
  error?: string;
}

const perPage = 10;
const DEBOUNCE_DELAY = 300; // ms

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ agentSelection, onChange, error }) => {
  const { docLinks } = useKibana().services;
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

  const {
    isLoading: agentsLoading,
    isRefetching: agentsRefetching,
    data: agentList,
    isFetched: agentsFetched,
  } = useAllAgents(debouncedSearchValue, {
    perPage,
    agentIds: agentSelection?.agents,
  });

  // option related
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<GroupOption[]>([]);
  const defaultValueInitialized = useRef(false);

  const numAgentsSelected = useMemo(() => {
    const { newAgentSelection, selectedAgents, selectedGroups } =
      generateAgentSelection(selectedOptions);
    if (newAgentSelection.allAgentsSelected) {
      return agentList?.total ?? 0;
    } else {
      const checkAgent = generateAgentCheck(selectedGroups);

      return (
        // filter out all the agents counted by selected policies and platforms
        selectedAgents.filter(checkAgent).length +
        // add the number of agents added via policy and platform groups
        getNumAgentsInGrouping(selectedGroups) -
        // subtract the number of agents double counted by policy/platform selections
        getNumOverlapped(selectedGroups, agentList?.groups?.overlap ?? {})
      );
    }
  }, [agentList?.groups?.overlap, agentList?.total, selectedOptions]);

  const onSelection = useCallback(
    (selection: GroupOption[]) => {
      const { newAgentSelection } = generateAgentSelection(selection);
      onChange(newAgentSelection);
      setSelectedOptions(selection);
    },
    [onChange]
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

    if (
      agentSelection &&
      !isEmpty(agentSelection) &&
      !defaultValueInitialized.current &&
      options.length &&
      !agentsRefetching
    ) {
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
  }, [agentSelection, agentsFetched, agentsRefetching, onSelection, options, selectedOptions]);

  useEffect(() => {
    if (agentsFetched && agentList?.groups) {
      // Cap policies to 10 on init dropdown
      const policies = (agentList.groups?.policies || []).slice(
        0,
        searchValue === '' ? 10 : undefined
      );

      const grouper = new AgentGrouper();
      // update the groups when groups or agents have changed
      grouper.setTotalAgents(agentList.total);
      grouper.updateGroup(AGENT_GROUP_KEY.Platform, agentList?.groups?.platforms ?? []);
      grouper.updateGroup(AGENT_GROUP_KEY.Policy, policies);
      grouper.updateGroup(AGENT_GROUP_KEY.Agent, agentList?.agents);
      const newOptions = grouper.generateOptions();
      setOptions((prevOptions) => (!deepEqual(prevOptions, newOptions) ? newOptions : prevOptions));
    }
  }, [agentList?.agents, agentList?.groups, agentList?.total, agentsFetched, searchValue]);

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

  const renderNoAgentAvailableWarning = () => {
    if (agentsFetched && agentList?.groups && !options.length) {
      return (
        <>
          <EuiCallOut color="danger" size="s" iconType="warning" title={NO_AGENT_AVAILABLE_TITLE}>
            <FormattedMessage
              id="xpack.osquery.agents.noAgentAvailableDescription"
              defaultMessage="Before you can query agents, they must be enrolled in an agent policy with the Osquery integration installed. Refer to {docsLink} for more information."
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                docsLink: (
                  <EuiLink
                    href={`${docLinks.links.fleet.agentPolicy}#apply-a-policy`}
                    target={'_blank'}
                  >
                    <FormattedMessage
                      id="xpack.osquery.agents.noAgentAvailableDescription.docsLink"
                      defaultMessage="Apply a policy"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      );
    }

    return null;
  };

  return (
    <div>
      <EuiFormRow label={AGENT_SELECTION_LABEL} fullWidth isInvalid={!!error} error={error}>
        <>
          {renderNoAgentAvailableWarning()}
          <EuiComboBox
            data-test-subj="agentSelection"
            placeholder={SELECT_AGENT_LABEL}
            isLoading={agentsLoading || modifyingSearch}
            options={options}
            isClearable={true}
            fullWidth={true}
            onSearchChange={onSearchChange}
            selectedOptions={selectedOptions}
            onChange={onSelection}
            renderOption={renderOption}
          />
        </>
      </EuiFormRow>
      <EuiSpacer size="xs" />
      {numAgentsSelected > 0 ? <span>{generateSelectedAgentsMessage(numAgentsSelected)}</span> : ''}
    </div>
  );
};

AgentsTableComponent.displayName = 'AgentsTable';

export const AgentsTable = React.memo(AgentsTableComponent, deepEqual);
