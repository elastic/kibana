/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import pMap from 'p-map';
import { protectionUpdatesNoteSavedObjectType } from '../../endpoint/lib/protection_updates_note/saved_object_mappings';

export const removeProtectionUpdatesNote = async (
  soClient: SavedObjectsClientContract,
  policy: Parameters<PostPackagePolicyPostDeleteCallback>[0][0]
) => {
  if (policy.id) {
    const foundProtectionUpdatesNotes = await soClient.find({
      type: protectionUpdatesNoteSavedObjectType,
      hasReference: {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        id: policy.id,
      },
    });
    await pMap(
      foundProtectionUpdatesNotes.saved_objects,
      (protectionUpdatesNote: { id: string }) => {
        soClient.delete(protectionUpdatesNoteSavedObjectType, protectionUpdatesNote.id);
      }
    );
  }
};
