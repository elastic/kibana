/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pick, reduce, isArray, filter, uniq, map, mapKeys } from 'lodash';
import { satisfies } from 'semver';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Shard } from '../../../common/schemas/common/utils';
import { DEFAULT_PLATFORM } from '../../../common/constants';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

// @ts-expect-error update types
export const convertPackQueriesToSO = (queries) =>
  reduce(
    queries,
    (acc, value, key: string) => {
      const ecsMapping = value.ecs_mapping && convertECSMappingToArray(value.ecs_mapping);
      acc.push({
        id: key,
        ...pick(value, ['name', 'query', 'interval', 'platform', 'version']),
        ...(value.snapshot !== undefined ? { snapshot: value.snapshot } : {}),
        ...(value.removed !== undefined ? { removed: value.removed } : {}),
        ...(ecsMapping ? { ecs_mapping: ecsMapping } : {}),
      });

      return acc;
    },
    [] as Array<{
      id: string;
      name: string;
      query: string;
      interval: number;
      snapshot?: boolean;
      removed?: boolean;
      ecs_mapping?: Record<string, unknown>;
    }>
  );

export const convertSOQueriesToPack = (
  // @ts-expect-error update types
  queries,
  options?: { removeMultiLines?: boolean; removeResultType?: boolean }
) =>
  reduce(
    queries,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    (acc, { id: queryId, ecs_mapping, query, platform, removed, snapshot, ...rest }, key) => {
      const resultType = !snapshot ? { removed, snapshot } : {};
      const index = queryId ? queryId : key;
      acc[index] = {
        ...rest,
        query: options?.removeMultiLines ? removeMultilines(query) : query,
        ...(!isEmpty(ecs_mapping)
          ? isArray(ecs_mapping)
            ? { ecs_mapping: convertECSMappingToObject(ecs_mapping) }
            : { ecs_mapping }
          : {}),
        ...(platform === DEFAULT_PLATFORM || platform === undefined ? {} : { platform }),
        ...(options?.removeResultType
          ? resultType
          : { ...(snapshot ? { snapshot } : {}), ...(removed ? { removed } : {}) }),
      };

      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>
  );

export const getInitialPolicies = (
  packagePolicies: PackagePolicy[] | never[],
  policyIds: string[] = [],
  shards?: Shard
) => {
  // we want to find all policies, because this is a global pack
  if (shards?.['*']) {
    const supportedPackagePolicyIds = filter(packagePolicies, (packagePolicy) =>
      satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
    );

    return uniq(map(supportedPackagePolicyIds, 'policy_id'));
  }

  return policyIds;
};

export const findMatchingShards = (agentPolicies: AgentPolicy[] | undefined, shards?: Shard) => {
  const policyShards: Shard = {};
  if (!isEmpty(shards)) {
    const agentPoliciesIdMap = mapKeys(agentPolicies, 'id');

    map(shards, (shard, shardName) => {
      if (agentPoliciesIdMap[shardName]) {
        policyShards[agentPoliciesIdMap[shardName].id] = shard;
      }
    });
  }

  return policyShards;
};
