/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference, SavedObjectsClient } from '@kbn/core/server';
import { filter, map } from 'lodash';
import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const getPackagePolicyDeleteCallback =
  (packsClient: SavedObjectsClient): PostPackagePolicyPostDeleteCallback =>
  async (deletedPackagePolicy) => {
    const deletedOsqueryManagerPolicies = filter(deletedPackagePolicy, [
      'package.name',
      OSQUERY_INTEGRATION_NAME,
    ]);
    await Promise.all(
      map(deletedOsqueryManagerPolicies, async (deletedOsqueryManagerPolicy) => {
        if (deletedOsqueryManagerPolicy.policy_id) {
          const foundPacks = await packsClient.find({
            type: packSavedObjectType,
            hasReference: {
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
              id: deletedOsqueryManagerPolicy.policy_id,
            },
            perPage: 1000,
          });

          await Promise.all(
            map(
              foundPacks.saved_objects,
              (pack: {
                id: string;
                references: SavedObjectReference[];
                attributes: { shards: Array<{ key: string; value: string }> };
              }) =>
                packsClient.update(
                  packSavedObjectType,
                  pack.id,
                  {
                    shards: filter(
                      pack.attributes.shards,
                      (shard) => shard.key !== deletedOsqueryManagerPolicy.policy_id
                    ),
                  },
                  {
                    references: filter(
                      pack.references,
                      (reference) => reference.id !== deletedOsqueryManagerPolicy.policy_id
                    ),
                  }
                )
            )
          );
        }
      })
    );
  };
