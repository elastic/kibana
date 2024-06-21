/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
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
} from './embeddable/embeddable';
import { SavedObjectIndexStore, checkForDuplicateTitle } from './persistence';
import { DOC_TYPE } from '../common/constants';
import { SharingSavedObjectProps } from './types';

type Reference = LensSavedObject['references'][number];

type checkDuplicateTitleProps = OnSaveProps & {
  id?: string;
  displayName: string;
  lastSavedTitle: string;
  copyOnSave: boolean;
}

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
  checkForDuplicateTitle: (props: checkDuplicateTitleProps) => Promise<{ isDuplicate: boolean }>;
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
): LensAttributesService {
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
    ) => {
      const {savedObjectId: newId} = await savedObjectStore.save({
        ...attributes,
        state: attributes.state as LensSavedObjectAttributes['state'],
        references,
        savedObjectId,
      });
      return newId;
    },
    checkForDuplicateTitle: async ({
      newTitle,
      isTitleDuplicateConfirmed,
      onTitleDuplicate = noop,
      displayName = DOC_TYPE,
      lastSavedTitle = '',
      copyOnSave = false,
      id,
    }: checkDuplicateTitleProps) => {
      return { isDuplicate: await checkForDuplicateTitle(
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
      )};
    },
  };
}
