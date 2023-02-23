/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient, SavedObjectsFindResponse } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set';
import { has, map, mapKeys } from 'lodash';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import produce from 'immer';
import { convertShardsToObject } from '../routes/utils';
import { packSavedObjectType } from '../../common/types';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import type { PackSavedObjectAttributes } from '../common/types';
import { convertSOQueriesToPackConfig } from '../routes/pack/utils';
import type { PackSavedObject } from '../common/types';

export const updateGlobalPacksCreateCallback = async (
  packagePolicy: NewPackagePolicy,
  packsClient: SavedObjectsClient,
  allPacks: SavedObjectsFindResponse<PackSavedObjectAttributes>,
  osqueryContext: OsqueryAppContextService
) => {
  const agentPolicyService = osqueryContext.getAgentPolicyService();

  const agentPoliciesResult = await agentPolicyService?.getByIds(packsClient, [
    packagePolicy.policy_id,
  ]);
  const agentPolicyResultIds = map(agentPoliciesResult, 'id');
  const agentPolicies = agentPoliciesResult
    ? mapKeys(await agentPolicyService?.getByIds(packsClient, agentPolicyResultIds), 'id')
    : {};

  const packsContainingShardForPolicy: PackSavedObject[] = [];
  allPacks.saved_objects.map((pack) => {
    const shards = convertShardsToObject(pack.attributes.shards);

    return map(shards, (shard, shardName) => {
      if (shardName === '*') {
        packsContainingShardForPolicy.push(pack);
      }
    });
  });

  if (packsContainingShardForPolicy.length) {
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

    return produce<NewPackagePolicy>(packagePolicy, (draft) => {
      if (!has(draft, 'inputs[0].streams')) {
        set(draft, 'inputs[0].streams', []);
      }

      map(packsContainingShardForPolicy, (pack) => {
        set(draft, `inputs[0].config.osquery.value.packs.${pack.attributes.name}`, {
          shard: 100,
          queries: convertSOQueriesToPackConfig(pack.attributes.queries),
        });
      });

      return draft;
    });
  }

  return packagePolicy;
};
