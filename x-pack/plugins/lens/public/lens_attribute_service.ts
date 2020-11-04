/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../src/core/public';
import { LensPluginStartDependencies } from './plugin';
import { AttributeService } from '../../../../src/plugins/dashboard/public';
import {
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
} from './editor_frame_service/embeddable/embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from './persistence';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';

export type LensAttributeService = AttributeService<
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput
>;

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
): LensAttributeService {
  const savedObjectStore = new SavedObjectIndexStore(core.savedObjects.client);
  return startDependencies.dashboard.getAttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >(DOC_TYPE, {
    saveMethod: async (attributes: LensSavedObjectAttributes, savedObjectId?: string) => {
      const savedDoc = await savedObjectStore.save({
        ...attributes,
        savedObjectId,
        type: DOC_TYPE,
      });
      return { id: savedDoc.savedObjectId };
    },
    unwrapMethod: async (savedObjectId: string): Promise<LensSavedObjectAttributes> => {
      const savedObject = await core.savedObjects.client.get<LensSavedObjectAttributes>(
        DOC_TYPE,
        savedObjectId
      );
      return {
        ...savedObject.attributes,
        references: savedObject.references,
      };
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      const savedObjectsClient = core.savedObjects.client;
      const overlays = core.overlays;
      return checkForDuplicateTitle(
        {
          title: props.newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          getEsType: () => DOC_TYPE,
          getDisplayName: () => DOC_TYPE,
        },
        props.isTitleDuplicateConfirmed,
        props.onTitleDuplicate,
        {
          savedObjectsClient,
          overlays,
        }
      );
    },
  });
}
