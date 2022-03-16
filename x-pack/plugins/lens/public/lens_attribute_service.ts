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
  LensSavedObjectAttributes,
  LensByValueInput,
  LensUnwrapMetaInfo,
  LensUnwrapResult,
  LensByReferenceInput,
} from './embeddable/embeddable';
import { SavedObjectIndexStore, checkForDuplicateTitle } from './persistence';
import { OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { DOC_TYPE } from '../common/constants';

export type LensAttributeService = AttributeService<
  LensSavedObjectAttributes,
  LensByValueInput,
  LensByReferenceInput,
  LensUnwrapMetaInfo
>;

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
): LensAttributeService {
  const savedObjectStore = new SavedObjectIndexStore(core.savedObjects.client);
  return startDependencies.embeddable.getAttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput,
    LensUnwrapMetaInfo
  >(DOC_TYPE, {
    saveMethod: async (attributes: LensSavedObjectAttributes, savedObjectId?: string) => {
      const savedDoc = await savedObjectStore.save({
        ...attributes,
        savedObjectId,
        type: DOC_TYPE,
      });
      return { id: savedDoc.savedObjectId };
    },
    unwrapMethod: async (savedObjectId: string): Promise<LensUnwrapResult> => {
      const {
        saved_object: savedObject,
        outcome,
        alias_target_id: aliasTargetId,
        alias_purpose: aliasPurpose,
      } = await savedObjectStore.load(savedObjectId);
      const { attributes, references, id } = savedObject;
      const document = {
        ...attributes,
        references,
      };

      const sharingSavedObjectProps = {
        aliasTargetId,
        outcome,
        aliasPurpose,
        sourceId: id,
      };

      return {
        attributes: {
          ...document,
        },
        metaInfo: {
          sharingSavedObjectProps,
        },
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
