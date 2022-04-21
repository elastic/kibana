/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { euiPaletteColorBlindBehindText } from '@elastic/eui';
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

interface Aggs extends estypes.AggregationsTermsAggregateBase {
  buckets: AggregationDataPoint[];
}

export const processAggregations = (aggs: Record<string, estypes.AggregationsAggregate>) => {
  const platforms: Group[] = [];
  const overlap: Overlap = {};
  const platformTerms = aggs.platforms as Aggs;
  const policyTerms = aggs.policies as Aggs;

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

export const generateAgentCheck =
  (selectedGroups: SelectedGroups) =>
  ({ groups }: AgentOptionValue) =>
    Object.keys(groups)
      .map((group) => {
        const selectedGroup = selectedGroups[group];
        const agentGroup = groups[group];

        // check if the agent platform/policy is selected
        return selectedGroup[agentGroup];
      })
      .every((a) => !a);

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

  for (const opt of selection) {
    const groupType = opt.value?.groupType;
    // best effort to get the proper identity
    const key = opt.key ?? opt.value?.id ?? opt.label;
    let value;
    switch (groupType) {
      case AGENT_GROUP_KEY.All:
        newAgentSelection.allAgentsSelected = true;
        break;
      case AGENT_GROUP_KEY.Platform:
        value = opt.value as GroupOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to calculate diffs when all agents are selected
          selectedGroups.platform[key] = value.size;
        }

        newAgentSelection.platformsSelected.push(key);
        break;
      case AGENT_GROUP_KEY.Policy:
        value = opt.value as GroupOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to calculate diffs when all agents are selected
          selectedGroups.policy[key] = value.size;
        }

        newAgentSelection.policiesSelected.push(key);
        break;
      case AGENT_GROUP_KEY.Agent:
        value = opt.value as AgentOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to count how many agents are selected if they are all selected
          selectedAgents.push(value);
        }

        newAgentSelection.agents.push(key);
        break;
      default:
        // this should never happen!
        // eslint-disable-next-line no-console
        console.error(`unknown group type ${groupType}`);
    }
  }

  return { newAgentSelection, selectedGroups, selectedAgents };
};
