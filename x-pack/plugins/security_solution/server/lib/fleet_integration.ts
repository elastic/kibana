/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';

import type { SavedObjectsClient } from '@kbn/core/server';
import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { protectionUpdatesNoteSavedObjectType } from '../endpoint/lib/protection_updates_note/saved_object_mappings';

export const getPackagePolicyDeleteCallback =
  (soClient: SavedObjectsClient): PostPackagePolicyPostDeleteCallback =>
  async (deletedPackagePolicy) => {
    const deletedEndpointPolicies = filter(deletedPackagePolicy, ['package.name', 'endpoint']);
    await Promise.all(
      map(deletedEndpointPolicies, async (deletedEndpointPolicy) => {
        if (deletedEndpointPolicy.id) {
          const foundProtectionUpdatesNotes = await soClient.find({
            type: protectionUpdatesNoteSavedObjectType,
            hasReference: {
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              id: deletedEndpointPolicy.id,
            },
          });

          await Promise.all(
            map(
              foundProtectionUpdatesNotes.saved_objects,
              (protectionUpdatesNote: { id: string }) => {
                soClient.delete(protectionUpdatesNoteSavedObjectType, protectionUpdatesNote.id);
              }
            )
          );
        }
      })
    );
  };
