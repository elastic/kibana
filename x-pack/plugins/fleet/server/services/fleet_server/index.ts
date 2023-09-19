/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import semverGte from 'semver/functions/gte';
import semverCoerce from 'semver/functions/coerce';

import { FLEET_SERVER_SERVERS_INDEX } from '../../constants';
import { getAgentVersionsForAgentPolicyIds } from '../agents';

import { packagePolicyService } from '../package_policy';
/**
 * Check if at least one fleet server is connected
 */
export async function hasFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<{}, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
    filter_path: 'hits.total',
    track_total_hits: true,
    rest_total_hits_as_int: true,
  });

  return (res.hits.total as number) > 0;
}

export async function allFleetServerVersionsAreAtLeast(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  version: string
): Promise<boolean> {
  let hasMore = true;
  const policyIds = new Set<string>();
  let page = 1;
  while (hasMore) {
    const res = await packagePolicyService.list(soClient, {
      page: page++,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:fleet_server',
    });

    for (const item of res.items) {
      policyIds.add(item.policy_id);
    }

    if (res.items.length === 0) {
      hasMore = false;
    }
  }

  const versionCounts = await getAgentVersionsForAgentPolicyIds(esClient, [...policyIds]);
  const versions = Object.keys(versionCounts);

  // there must be at least one fleet server agent for this check to pass
  if (versions.length === 0) {
    return false;
  }

  return _allVersionsAreAtLeast(version, versions);
}

function _allVersionsAreAtLeast(version: string, versions: string[]) {
  return versions.every((v) => semverGte(semverCoerce(v)!, version));
}
