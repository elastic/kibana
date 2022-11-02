/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  SavedObjectsClient,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { has, map, mapKeys, set, unset } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import produce from 'immer';
import type { Shard } from '../../common/schemas/common/utils';
import { packSavedObjectType } from '../../common/types';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import type { PackSavedObjectAttributes } from '../common/types';
import { convertSOQueriesToPack } from '../routes/pack/utils';
import type { PackSavedObject } from '../common/types';

export const updateGlobalPacksCreateCallback = async (
  packagePolicy: PackagePolicy,
  packsClient: SavedObjectsClient,
  allPacks: SavedObjectsFindResponse<PackSavedObjectAttributes>,
  osqueryContext: OsqueryAppContextService,
  esClient: ElasticsearchClient
) => {
  const agentPolicyService = osqueryContext.getAgentPolicyService();

  const packagePolicyService = osqueryContext.getPackagePolicyService();
  const agentPoliciesResult = await agentPolicyService?.getByIds(packsClient, [
    packagePolicy.policy_id,
  ]);
  const list = map(agentPoliciesResult, 'id');
  const agentPolicies = agentPoliciesResult
    ? mapKeys(await agentPolicyService?.getByIds(packsClient, list), 'id')
    : {};

  const packsContainingShardForPolicy: PackSavedObject[] = [];
  const policyShards: Shard = {};
  allPacks.saved_objects.map((pack) => {
    const shards = pack.attributes.shards;

    return map(shards, (shard, shardName) => {
      if (shardName === '*') {
        packsContainingShardForPolicy.push(pack);
      } else if (agentPolicies[packagePolicy.policy_id]?.name.startsWith(shardName)) {
        packsContainingShardForPolicy.push(pack);
        policyShards[pack.attributes.name] = shard;
      }
    });
  });

  await Promise.all(
    map(packsContainingShardForPolicy, (pack) => {
      packsClient.update(
        packSavedObjectType,
        pack.id,
        {},
        {
          references: [
            ...pack.references,
            {
              id: packagePolicy.policy_id,
              name: agentPolicies[packagePolicy.policy_id]?.name,
              type: AGENT_POLICY_SAVED_OBJECT_TYPE,
            },
          ],
        }
      );
    })
  );
  await packagePolicyService?.update(
    packsClient,
    esClient,
    packagePolicy.id,
    produce<PackagePolicy>(packagePolicy, (draft) => {
      unset(draft, 'id');
      if (!has(draft, 'inputs[0].streams')) {
        set(draft, 'inputs[0].streams', []);
      }

      map(packsContainingShardForPolicy, (pack) => {
        set(draft, `inputs[0].config.osquery.value.packs.${pack.attributes.name}`, {
          shard: policyShards[pack.attributes.name] ? policyShards[pack.attributes.name] : 100,
          queries: convertSOQueriesToPack(pack.attributes.queries, {
            removeMultiLines: true,
            removeResultType: true,
          }),
        });
      });

      return draft;
    })
  );
};
