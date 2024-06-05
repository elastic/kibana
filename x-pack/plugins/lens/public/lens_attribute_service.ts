/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
// import type { AttributeService } from '@kbn/embeddable-plugin/public';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { noop } from 'lodash';
import type { LensPluginStartDependencies } from './plugin';
import type {
  LensSavedObject,
  LensSavedObjectAttributes as LensSavedObjectAttributesWithoutReferences,
} from '../common/content_management';
import type {
  LensSavedObjectAttributes,
  // LensByValueInput,
  // LensUnwrapMetaInfo,
  // LensUnwrapResult,
  // LensByReferenceInput,
} from './embeddable/embeddable';
import { SavedObjectIndexStore, checkForDuplicateTitle } from './persistence';
import { DOC_TYPE } from '../common/constants';
import { SharingSavedObjectProps } from './types';

type Reference = LensSavedObject['references'][number];

// export type LensAttributeService = AttributeService<
//   LensSavedObjectAttributes,
//   LensByValueInput,
//   LensByReferenceInput,
//   LensUnwrapMetaInfo
// >;

export interface LensAttributesService {
  loadFromLibrary: (savedObjectId: string) => Promise<{
    attributes: LensSavedObjectAttributes;
    sharingSavedObjectProps: SharingSavedObjectProps;
    managed: boolean;
  }>;
  saveToLibrary: (
    attributes: LensSavedObjectAttributesWithoutReferences,
    references: Reference[],
    savedObjectId?: string
  ) => Promise<string>;
  checkForDuplicateTitle: (props: OnSaveProps) => Promise<{ isDuplicate: boolean }>;
}

export const savedObjectToEmbeddableAttributes = (
  savedObject: SavedObjectCommon<LensSavedObjectAttributesWithoutReferences>
): LensSavedObjectAttributes => {
  return {
    ...savedObject.attributes,
    state: savedObject.attributes.state as LensSavedObjectAttributes['state'],
    references: savedObject.references,
  };
};

export function getLensAttributeService(
  core: CoreStart,
  startDependencies: LensPluginStartDependencies
) {
  const savedObjectStore = new SavedObjectIndexStore(startDependencies.contentManagement);

  return {
    loadFromLibrary: async (
      savedObjectId: string
    ): Promise<{
      attributes: LensSavedObjectAttributes;
      sharingSavedObjectProps: SharingSavedObjectProps;
      managed: boolean;
    }> => {
      const { meta, item } = await savedObjectStore.load(savedObjectId);
      return {
        attributes: {
          ...item.attributes,
          state: item.attributes.state as LensSavedObjectAttributes['state'],
          references: item.references,
        },
        sharingSavedObjectProps: {
          aliasTargetId: meta.aliasTargetId,
          outcome: meta.outcome,
          aliasPurpose: meta.aliasPurpose,
          sourceId: item.id,
        },
        managed: Boolean(item.managed),
      };
    },
    saveToLibrary: async (
      attributes: LensSavedObjectAttributesWithoutReferences,
      references: Reference[],
      savedObjectId?: string
    ) =>
      savedObjectStore.save({
        ...attributes,
        state: attributes.state as LensSavedObjectAttributes['state'],
        references,
        savedObjectId,
      }),
    checkForDuplicateTitle: ({
      newTitle,
      isTitleDuplicateConfirmed,
      onTitleDuplicate = noop,
      displayName = DOC_TYPE,
      lastSavedTitle = '',
      copyOnSave = false,
      id,
    }: OnSaveProps & {
      id?: string;
      displayName: string;
      lastSavedTitle: string;
      copyOnSave: boolean;
    }) => {
      return checkForDuplicateTitle(
        {
          id,
          title: newTitle,
          isTitleDuplicateConfirmed,
          displayName,
          lastSavedTitle,
          copyOnSave,
        },
        onTitleDuplicate,
        {
          client: savedObjectStore,
          ...core,
        }
      );
    },
  };
}

// export function getLensAttributeService2(
//   core: CoreStart,
//   startDependencies: LensPluginStartDependencies
// ): LensAttributeService {
//   const savedObjectStore = new SavedObjectIndexStore(startDependencies.contentManagement);

//   return startDependencies.embeddable.getAttributeService<
//     LensSavedObjectAttributes,
//     LensByValueInput,
//     LensByReferenceInput,
//     LensUnwrapMetaInfo
//   >(DOC_TYPE, {
//     saveMethod: async (attributes: LensSavedObjectAttributes, savedObjectId?: string) => {
//       const savedDoc = await savedObjectStore.save({
//         ...attributes,
//         savedObjectId,
//         type: DOC_TYPE,
//       });
//       return { id: savedDoc.savedObjectId };
//     },
//     unwrapMethod: async (savedObjectId: string): Promise<LensUnwrapResult> => {
//       const {
//         item: savedObject,
//         meta: { outcome, aliasTargetId, aliasPurpose },
//       } = await savedObjectStore.load(savedObjectId);
//       const { id } = savedObject;

//       const sharingSavedObjectProps = {
//         aliasTargetId,
//         outcome,
//         aliasPurpose,
//         sourceId: id,
//       };

//       return {
//         attributes: savedObjectToEmbeddableAttributes(savedObject),
//         metaInfo: {
//           sharingSavedObjectProps,
//           managed: savedObject.managed,
//         },
//       };
//     },
//     checkForDuplicateTitle: (props: OnSaveProps) => {
//       return checkForDuplicateTitle(
//         {
//           title: props.newTitle,
//           displayName: DOC_TYPE,
//           isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
//           lastSavedTitle: '',
//           copyOnSave: false,
//         },
//         props.onTitleDuplicate,
//         {
//           client: savedObjectStore,
//           ...core,
//         }
//       );
//     },
//   });
// }
