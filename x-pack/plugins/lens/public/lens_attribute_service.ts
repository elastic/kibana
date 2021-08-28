/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '../../../../src/core/public/types';
import { AttributeService } from '../../../../src/plugins/embeddable/public/lib/attribute_service/attribute_service';
import { checkForDuplicateTitle } from '../../../../src/plugins/saved_objects/public/saved_object/helpers/check_for_duplicate_title';
import type { OnSaveProps } from '../../../../src/plugins/saved_objects/public/save_modal/saved_object_save_modal';
import { DOC_TYPE } from '../common/constants';
import type {
  LensByReferenceInput,
  LensByValueInput,
  LensSavedObjectAttributes,
} from './embeddable/embeddable';
import type { Document } from './persistence/saved_object_store';
import { SavedObjectIndexStore } from './persistence/saved_object_store';
import type { LensPluginStartDependencies } from './plugin';

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
