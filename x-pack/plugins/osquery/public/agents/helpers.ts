/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregate, TermsAggregate } from '@elastic/elasticsearch/api/types';
import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import {
  PaginationInputPaginated,
  FactoryQueryTypes,
  StrategyResponseType,
  Inspect,
} from '../../common/search_strategy';
import {
  AGENT_GROUP_KEY,
  SelectedGroups,
  Overlap,
  Group,
  AgentOptionValue,
  AggregationDataPoint,
  AgentSelection,
  GroupOptionValue,
  GroupOption,
} from './types';

export type InspectResponse = Inspect & { response: string[] };

export const getNumOverlapped = (
  { policy = {}, platform = {} }: SelectedGroups,
  overlap: Overlap
) => {
  let sum = 0;
  Object.keys(platform).forEach((plat) => {
    const policies = overlap[plat] ?? {};
    Object.keys(policy).forEach((pol) => {
      sum += policies[pol] ?? 0;
    });
  });
  return sum;
};
export const processAggregations = (aggs: Record<string, Aggregate>) => {
  const platforms: Group[] = [];
  const overlap: Overlap = {};
  const platformTerms = aggs.platforms as TermsAggregate<AggregationDataPoint>;
  const policyTerms = aggs.policies as TermsAggregate<AggregationDataPoint>;

  const policies =
    policyTerms?.buckets.map((o) => ({ name: o.key, id: o.key, size: o.doc_count })) ?? [];

  if (platformTerms?.buckets) {
    for (const { key, doc_count: size, policies: platformPolicies } of platformTerms.buckets) {
      platforms.push({ name: key, id: key, size });
      if (platformPolicies?.buckets && policies.length > 0) {
        overlap[key] = platformPolicies.buckets.reduce((acc: { [key: string]: number }, pol) => {
          acc[pol.key] = pol.doc_count;
          return acc;
        }, {} as { [key: string]: number });
      }
    }
  }

  return {
    platforms,
    overlap,
    policies,
  };
};
export const generateColorPicker = () => {
  const visColorsBehindText = euiPaletteColorBlindBehindText();
  const typeColors = new Map<AGENT_GROUP_KEY, string>();
  return (type: AGENT_GROUP_KEY) => {
    if (!typeColors.has(type)) {
      typeColors.set(type, visColorsBehindText[typeColors.size]);
    }
    return typeColors.get(type);
  };
};

export const getNumAgentsInGrouping = (selectedGroups: SelectedGroups) => {
  let sum = 0;
  Object.keys(selectedGroups).forEach((g) => {
    const group = selectedGroups[g];
    sum += Object.keys(group).reduce((acc, k) => acc + group[k], 0);
  });
  return sum;
};

export const generateAgentCheck = (selectedGroups: SelectedGroups) => {
  return ({ groups }: AgentOptionValue) => {
    return Object.keys(groups)
      .map((group) => {
        const selectedGroup = selectedGroups[group];
        const agentGroup = groups[group];
        // check if the agent platform/policy is selected
        return selectedGroup[agentGroup];
      })
      .every((a) => !a);
  };
};

export const generateAgentSelection = (selection: GroupOption[]) => {
  const newAgentSelection: AgentSelection = {
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
  return { newAgentSelection, selectedGroups, selectedAgents };
};

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;
  return {
    activePage,
    cursorStart,
    fakePossibleCount: 4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5,
    querySize: limit,
  };
};

export const getInspectResponse = <T extends FactoryQueryTypes>(
  response: StrategyResponseType<T>,
  prevResponse?: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  // @ts-expect-error update types
  response:
    response != null ? [JSON.stringify(response.rawResponse, null, 2)] : prevResponse?.response,
});
