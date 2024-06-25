/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import { emptySerializer } from '../helper';
import { LensRuntimeState, LensEmbeddableStartServices } from '../types';

export function initializeLibraryServices(
  getState: () => LensRuntimeState,
  { attributeService }: LensEmbeddableStartServices
) {
  return {
    api: {
      saveToLibrary: async (title: string) => {
        const state = getState();
        const savedObjectId = await attributeService.saveToLibrary(
          state.attributes,
          state.attributes.references
        );
        return savedObjectId;
      },
      checkForDuplicateTitle: async (
        newTitle: string,
        isTitleDuplicateConfirmed: boolean,
        onTitleDuplicate: () => void
      ) => {
        await attributeService.checkForDuplicateTitle({
          newTitle,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
          newCopyOnSave: false,
          newDescription: '',
          displayName: '',
          lastSavedTitle: '',
          copyOnSave: false,
        });
      },
      canLinkToLibrary: async () => !getState().savedObjectId,
      canUnlinkFromLibrary: async () => Boolean(getState().savedObjectId),
      getByReferenceState(libraryId: string): object {
        return attributeService.loadFromLibrary(libraryId);
      },
      getByValueState(): object {
        const { savedObjectId, ...rest } = getState();
        return rest;
      },
    },
    cleanup: noop,
    serialize: emptySerializer,
    comparators: {},
  };
}
