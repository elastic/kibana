/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../src/core/public';
import { LensPluginStartDependencies } from './plugin';
import { AttributeService } from '../../../../src/plugins/embeddable/public';
import {
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
} from './editor_frame_service/embeddable/embeddable';
import { SavedObjectIndexStore, Document } from './persistence';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { DOC_TYPE } from '../common';

export type LensAttributeService = AttributeService<
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput
>;

function documentToAttributes(doc: Document): LensSavedObjectAttributes {
  delete doc.savedObjectId;
  delete doc.type;
  return { ...doc };
}

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
): LensAttributeService {
  const savedObjectStore = new SavedObjectIndexStore(core.savedObjects.client);
  return startDependencies.embeddable.getAttributeService<
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
      const attributes = documentToAttributes(await savedObjectStore.load(savedObjectId));
      return attributes;
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
