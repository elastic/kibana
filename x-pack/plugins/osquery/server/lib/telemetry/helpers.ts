/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, find, isEmpty, pick, isString } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { PackSavedObject, SavedQuerySavedObject } from '../../common/types';

/**
 * Constructs the configs telemetry schema from a collection of config saved objects
 */
export const templateConfigs = (configsData: PackagePolicy[]) =>
  configsData.map((item) => ({
    id: item.id,
    version: item.package?.version,
    enabled: item.enabled,
    config: find(item.inputs, ['type', 'osquery'])?.config?.osquery.value,
  }));

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templatePacks = (packsData: PackSavedObject[]) => {
  const nonEmptyQueryPacks = filter(packsData, (pack) => !isEmpty(pack.queries));

  return nonEmptyQueryPacks.map((item) =>
    pick(
      {
        name: item.name,
        enabled: item.enabled,
        queries: item.queries,
        policies: (filter(item.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id')
          ?.length,
        prebuilt:
          !!filter(item.references, ['type', 'osquery-pack-asset']) && item.version !== undefined,
      },
      ['name', 'queries', 'policies', 'prebuilt', 'enabled']
    )
  );
};

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templateSavedQueries = (
  savedQueriesData: SavedQuerySavedObject[],
  prebuiltSavedQueryIds: string[]
) =>
  savedQueriesData.map((item) => ({
    id: item.id,
    query: item.query,
    platform: item.platform,
    interval: isString(item.interval) ? parseInt(item.interval, 10) : item.interval,
    ...(!isEmpty(item.snapshot) ? { snapshot: item.snapshot } : {}),
    ...(!isEmpty(item.removed) ? { snapshot: item.removed } : {}),
    ...(!isEmpty(item.ecs_mapping) ? { ecs_mapping: item.ecs_mapping } : {}),
    prebuilt: prebuiltSavedQueryIds.includes(item.id),
  }));
