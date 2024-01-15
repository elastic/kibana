/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RequestHandler,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { protectionUpdatesNoteSavedObjectType } from '../../lib/protection_updates_note/saved_object_mappings';
import type {
  CreateUpdateProtectionUpdatesNoteSchema,
  GetProtectionUpdatesNoteSchema,
} from '../../../../common/api/endpoint/protection_updates_note/protection_updates_note_schema';

const getProtectionNote = async (SOClient: SavedObjectsClientContract, packagePolicyId: string) => {
  return SOClient.find<{ note: string }>({
    type: protectionUpdatesNoteSavedObjectType,
    hasReference: { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: packagePolicyId },
  });
};

const updateProtectionNote = async (
  SOClient: SavedObjectsClientContract,
  noteId: string,
  note: string,
  references: SavedObjectReference[]
) => {
  return SOClient.update(
    protectionUpdatesNoteSavedObjectType,
    noteId,
    {
      note,
    },
    {
      references,
      refresh: 'wait_for',
    }
  );
};

const createProtectionNote = async (
  SOClient: SavedObjectsClientContract,
  note: string,
  references: SavedObjectReference[]
) => {
  return SOClient.create(
    protectionUpdatesNoteSavedObjectType,
    {
      note,
    },
    {
      references,
      refresh: 'wait_for',
    }
  );
};

export const postProtectionUpdatesNoteHandler = function (): RequestHandler<
  TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.params>,
  undefined,
  TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.body>
> {
  return async (context, request, response) => {
    const SOClient = (await context.core).savedObjects.client;
    const { package_policy_id: packagePolicyId } = request.params;
    const { note } = request.body;

    const soClientResponse = await getProtectionNote(SOClient, packagePolicyId);

    if (soClientResponse.saved_objects[0]) {
      const { references } = soClientResponse.saved_objects[0];

      const updatedNoteSO = await updateProtectionNote(
        SOClient,
        soClientResponse.saved_objects[0].id,
        note,
        references
      );

      const { attributes } = updatedNoteSO;

      return response.ok({ body: attributes });
    }

    const references: SavedObjectReference[] = [
      {
        id: packagePolicyId,
        name: 'package_policy',
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      },
    ];

    const noteSO = await createProtectionNote(SOClient, note, references);

    const { attributes } = noteSO;

    return response.ok({ body: attributes });
  };
};

export const getProtectionUpdatesNoteHandler = function (): RequestHandler<
  TypeOf<typeof GetProtectionUpdatesNoteSchema.params>,
  undefined,
  undefined
> {
  return async (context, request, response) => {
    const SOClient = (await context.core).savedObjects.client;
    const { package_policy_id: packagePolicyId } = request.params;

    const soClientResponse = await getProtectionNote(SOClient, packagePolicyId);

    if (!soClientResponse.saved_objects[0] || !soClientResponse.saved_objects[0].attributes) {
      return response.notFound({ body: { message: 'No note found for this policy' } });
    }

    const { attributes } = soClientResponse.saved_objects[0];

    return response.ok({ body: attributes });
  };
};
