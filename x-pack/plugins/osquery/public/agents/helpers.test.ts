/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import { generateGroupOption } from './agent_grouper';
import {
  getNumOverlapped,
  getNumAgentsInGrouping,
  processAggregations,
  generateAgentSelection,
} from './helpers';
import type { GroupOption, Overlap, SelectedGroups } from './types';
import { AGENT_GROUP_KEY } from './types';

describe('generateAgentSelection', () => {
  it('should handle empty input', () => {
    const options: GroupOption[] = [];
    const { newAgentSelection, selectedGroups, selectedAgents } = generateAgentSelection(options);
    expect(newAgentSelection).toEqual({
      agents: [],
      allAgentsSelected: false,
      platformsSelected: [],
      policiesSelected: [],
    });
    expect(selectedAgents).toEqual([]);
    expect(selectedGroups).toEqual({
      policy: {},
      platform: {},
    });
  });

  it('should properly pull out group ids', () => {
    const options: GroupOption[] = [];
    const policyOptions = generateGroupOption('policy', AGENT_GROUP_KEY.Policy, [
      { name: 'policy 1', id: 'policy 1', size: 5 },
      { name: 'policy 2', id: uuid(), size: 5 },
    ]).options;
    options.push(...policyOptions);

    const platformOptions = generateGroupOption('platform', AGENT_GROUP_KEY.Platform, [
      { name: 'platform 1', id: 'platform 1', size: 5 },
      { name: 'platform 2', id: uuid(), size: 5 },
    ]).options;
    options.push(...platformOptions);

    const { newAgentSelection, selectedGroups, selectedAgents } = generateAgentSelection(options);
    expect(newAgentSelection).toEqual({
      agents: [],
      allAgentsSelected: false,
      platformsSelected: platformOptions.map(({ value: { id } }) => id),
      policiesSelected: policyOptions.map(({ value: { id } }) => id),
    });
    expect(selectedAgents).toEqual([]);
    expect(Object.keys(selectedGroups.platform).length).toEqual(2);
    expect(Object.keys(selectedGroups.policy).length).toEqual(2);
  });
});

describe('processAggregations', () => {
  it('should handle empty inputs properly', () => {
    const input = {};
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([]);
    expect(policies).toEqual([]);
    expect(overlap).toEqual({});
  });
  it('should handle platforms with no policies', () => {
    const input = {
      platforms: {
        buckets: [
          {
            key: 'darwin',
            doc_count: 200,
            policies: {
              buckets: [],
            },
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([
      {
        id: 'darwin',
        name: 'darwin',
        size: 200,
      },
    ]);
    expect(policies).toEqual([]);
    expect(overlap).toEqual({});
  });
  it('should handle policies with no platforms', () => {
    const input = {
      policies: {
        buckets: [
          {
            key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
          {
            key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([]);
    expect(policies).toEqual([
      {
        id: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        name: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
      {
        id: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        name: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
    ]);
    expect(overlap).toEqual({});
  });
  it('should parse aggregation responses down into metadata objects', () => {
    const input = {
      policies: {
        buckets: [
          {
            key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
          {
            key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
        ],
      },
      platforms: {
        buckets: [
          {
            key: 'darwin',
            doc_count: 200,
            policies: {
              buckets: [
                {
                  key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
                  doc_count: 100,
                },
                {
                  key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
                  doc_count: 100,
                },
              ],
            },
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([
      {
        id: 'darwin',
        name: 'darwin',
        size: 200,
      },
    ]);
    expect(policies).toEqual([
      {
        id: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        name: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
      {
        id: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        name: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
    ]);
    expect(overlap).toEqual({
      darwin: {
        '8cd06880-8a74-11eb-86cb-c58693443a4f': 100,
        '8cd01a60-8a74-11eb-86cb-c58693443a4f': 100,
      },
    });
  });
});

describe('getNumAgentsInGrouping', () => {
  it('should handle empty objects', () => {
    const selectedGroups: SelectedGroups = {};
    expect(getNumAgentsInGrouping(selectedGroups)).toEqual(0);
  });

  it('should add up the quantities for the selected groups', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
      },
      policy: {
        policy_id1: 40,
      },
    };
    expect(getNumAgentsInGrouping(selectedGroups)).toEqual(75);
  });
});

describe('getNumOverlapped', () => {
  const overlap: Overlap = {
    darwin: {
      policy_id1: 15,
      policy_id2: 35,
    },
    linux: {
      policy_id1: 25,
      policy_id2: 10,
    },
  };

  it('should add up the quantities associated with a platform/policy selection', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
      },
      policy: {
        policy_id1: 40,
      },
    };

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(25);
  });

  it('should gracefully handle empty objects', () => {
    const selectedGroups: SelectedGroups = {};

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing platforms', () => {
    const selectedGroups: SelectedGroups = {
      policy: {
        policy_id1: 40,
        policy_id3: 40,
      },
    };
    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing policies', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
        windows: 40,
      },
    };
    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing group selections', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
        windows: 40,
      },
      policy: {
        policy_id1: 40,
        policy_id3: 40,
      },
    };

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(25);
  });
});
