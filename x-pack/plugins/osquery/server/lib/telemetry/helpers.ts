/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, find, isEmpty, pick, isString } from 'lodash';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type {
  PackSavedObjectAttributes,
  SavedQuerySavedObjectAttributes,
} from '../../common/types';

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
export const templatePacks = (
  packsData: SavedObjectsFindResponse<PackSavedObjectAttributes>['saved_objects']
) => {
  const nonEmptyQueryPacks = filter(packsData, (pack) => !isEmpty(pack.attributes.queries));

  return nonEmptyQueryPacks.map((item) =>
    pick(
      {
        name: item.attributes.name,
        enabled: item.attributes.enabled,
        queries: item.attributes.queries,
        policies: (filter(item.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id')?.length,
        prebuilt:
          !!filter(item.references, ['type', 'osquery-pack-asset']) &&
          item.attributes.version !== undefined,
      },
      ['name', 'queries', 'policies', 'prebuilt', 'enabled']
    )
  );
};

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templateSavedQueries = (
  savedQueriesData: SavedObjectsFindResponse<SavedQuerySavedObjectAttributes>['saved_objects'],
  prebuiltSavedQueryIds: string[]
) =>
  savedQueriesData.map((item) => ({
    id: item.attributes.id,
    query: item.attributes.query,
    platform: item.attributes.platform,
    interval: isString(item.attributes.interval)
      ? parseInt(item.attributes.interval, 10)
      : item.attributes.interval,
    ...(!isEmpty(item.attributes.snapshot) ? { snapshot: item.attributes.snapshot } : {}),
    ...(!isEmpty(item.attributes.removed) ? { snapshot: item.attributes.removed } : {}),
    ...(!isEmpty(item.attributes.ecs_mapping) ? { ecs_mapping: item.attributes.ecs_mapping } : {}),
    prebuilt: prebuiltSavedQueryIds.includes(item.id),
  }));
