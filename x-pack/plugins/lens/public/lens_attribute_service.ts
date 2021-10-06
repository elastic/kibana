/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '../../../../src/core/public';
import type { LensPluginStartDependencies } from './plugin';
import type { AttributeService } from '../../../../src/plugins/embeddable/public';
import type {
  ResolvedLensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
} from './embeddable/embeddable';
import { SavedObjectIndexStore } from './persistence';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { DOC_TYPE } from '../common/constants';

export type LensAttributeService = AttributeService<
  ResolvedLensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput
>;

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
): LensAttributeService {
  const savedObjectStore = new SavedObjectIndexStore(core.savedObjects.client);
  return startDependencies.embeddable.getAttributeService<
    ResolvedLensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >(DOC_TYPE, {
    saveMethod: async (attributes: ResolvedLensSavedObjectAttributes, savedObjectId?: string) => {
      const { sharingSavedObjectProps, ...attributesToSave } = attributes;
      const savedDoc = await savedObjectStore.save({
        ...attributesToSave,
        savedObjectId,
        type: DOC_TYPE,
      });
      return { id: savedDoc.savedObjectId };
    },
    unwrapMethod: async (savedObjectId: string): Promise<ResolvedLensSavedObjectAttributes> => {
      const {
        saved_object: savedObject,
        outcome,
        alias_target_id: aliasTargetId,
      } = await savedObjectStore.load(savedObjectId);
      const { attributes, references, id } = savedObject;
      const document = {
        ...attributes,
        references,
      };

      const sharingSavedObjectProps = {
        aliasTargetId,
        outcome,
        sourceId: id,
      };

      return {
        sharingSavedObjectProps,
        ...document,
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
