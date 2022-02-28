/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference, SavedObjectsClient } from 'kibana/server';
import { filter, map } from 'lodash';
import { packSavedObjectType } from '../../common/types';
import { PostPackagePolicyDeleteCallback } from '../../../fleet/server';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const getPackagePolicyDeleteCallback =
  (packsClient: SavedObjectsClient): PostPackagePolicyDeleteCallback =>
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
