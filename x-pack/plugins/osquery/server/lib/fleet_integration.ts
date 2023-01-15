/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  SavedObjectReference,
  SavedObjectsClient,
} from '@kbn/core/server';
import { filter, map, orderBy } from 'lodash';
import deepequal from 'fast-deep-equal';
import { satisfies } from 'semver';
import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import type { UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { packSavedObjectType } from '../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const getPackagePolicyUpdateCallback =
  (esClient: ElasticsearchClient) => async (updatePackagePolicy: UpdatePackagePolicy) => {
    if (
      updatePackagePolicy.package?.name === OSQUERY_INTEGRATION_NAME &&
      satisfies(updatePackagePolicy.package?.version ?? '', '>=1.6.0')
    ) {
      const mapping = await esClient.indices.getMapping({
        index: `logs-${OSQUERY_INTEGRATION_NAME}.result-*`,
      });
      // Sort by index name to get the latest index
      const dataStreamMapping = orderBy(Object.entries(mapping), [0], 'desc')?.[0][1]?.mappings
        ?.properties?.data_stream;

      if (
        dataStreamMapping &&
        deepequal(dataStreamMapping, {
          properties: {
            dataset: {
              type: 'constant_keyword',
              value: 'generic',
            },
            namespace: {
              type: 'constant_keyword',
              value: 'default',
            },
            type: {
              type: 'constant_keyword',
              value: 'osquery',
            },
          },
        })
      ) {
        try {
          esClient.indices.rollover({
            alias: `logs-${OSQUERY_INTEGRATION_NAME}.result-default`,
          });
        } catch (e) {
          // Ignore errors
        }
      }
    }

    return updatePackagePolicy;
  };

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
              type: AGENT_POLICY_SAVED_OBJECT_TYPE,
              id: deletedOsqueryManagerPolicy.policy_id,
            },
            perPage: 1000,
          });

          await Promise.all(
            map(
              foundPacks.saved_objects,
              (pack: { id: string; references: SavedObjectReference[] }) =>
                packsClient.update(
                  packSavedObjectType,
                  pack.id,
                  {},
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
