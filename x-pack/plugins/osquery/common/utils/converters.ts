/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, reduce } from 'lodash';
import type { DefaultValues } from 'react-hook-form';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';

export type ECSMappingArray = Array<{
  key: string;
  result: {
    type: string;
    value: string | string[];
  };
}>;

export const convertECSMappingToObject = (ecsMapping: ECSMappingArray): ECSMapping =>
  reduce(
    ecsMapping,
    (acc, value) => {
      if (!isEmpty(value?.key) && !isEmpty(value.result?.type) && !isEmpty(value.result?.value)) {
        acc[value.key] = {
          [value.result.type]: value.result.value,
        };
      }

      return acc;
    },
    {} as ECSMapping
  );

export const convertECSMappingToArray = (
  ecsMapping: DefaultValues<ECSMapping> | undefined
): ECSMappingArray =>
  reduce(
    ecsMapping,
    (acc, value, key) => {
      if (value) {
        acc.push({
          key,
          result: {
            type: Object.keys(value)[0],
            value: Object.values(value as string | string[])[0],
          },
        });
      }

      return acc;
    },
    [] as ECSMappingArray
  );

export type ShardsArray = Array<{
  policy: {
    key: string;
    label: string;
  };
  percentage: number;
}>;

export type Shard = Record<string, number>;

export const convertShardsToObject = (shards: ShardsArray): Shard =>
  reduce(
    shards,
    (acc, value) => {
      if (!isEmpty(value?.policy)) {
        acc[value.policy.key] = value.percentage;
      }

      return acc;
    },
    {} as Shard
  );

export const convertShardsToArray = (
  shards: DefaultValues<Shard>,
  policiesById?: Record<string, GetAgentPoliciesResponseItem>
): ShardsArray =>
  reduce(
    shards,
    (acc, value, key) => {
      if (value != null) {
        acc.push({
          policy: {
            key,
            label: policiesById?.[key]?.name ?? '',
          },
          percentage: value,
        });
      }

      return acc;
    },
    [] as ShardsArray
  );
