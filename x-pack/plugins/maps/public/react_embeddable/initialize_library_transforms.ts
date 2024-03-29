/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { HasLibraryTransforms } from '@kbn/presentation-publishing';
import { getCore, getCoreOverlays } from '../kibana_services';
import { SavedMap } from '../routes/map_page';
import { checkForDuplicateTitle, getMapClient } from '../content_management';
import { MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { MapSerializeState } from './types';

export function initializeLibraryTransforms(
  savedMap: SavedMap,
  serializeState: () => SerializedPanelState<MapSerializeState>
): HasLibraryTransforms<MapSerializeState> {
  return {
    canLinkToLibrary: async () => {
      const { maps } = getCore().application.capabilities;
      return maps.save && savedMap.getSavedObjectId() === undefined;
    },
    saveToLibrary: async (title: string) => {
      const state = serializeState();
      const {
        item: { id: savedObjectId },
      } = await getMapClient().create({
        data: {
          ...(state.rawState?.attributes ?? {}),
          title,
        },
        options: { references: state.references ?? [] },
      });
      return savedObjectId;
    },
    getByReferenceState: (libraryId: string) => {
      const state = serializeState();
      const { attributes, ...byRefState } = state.rawState ?? {};
      return {
        ...byRefState,
        savedObjectId: libraryId,
      };
    },
    checkForDuplicateTitle: async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      await checkForDuplicateTitle(
        {
          title: newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          isTitleDuplicateConfirmed,
          getDisplayName: () => MAP_EMBEDDABLE_NAME,
          onTitleDuplicate,
        },
        {
          overlays: getCoreOverlays(),
        }
      );
    },
    canUnlinkFromLibrary: async () => {
      return savedMap.getSavedObjectId() !== undefined;
    },
    getByValueState: () => {
      const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
      return {
        ...byValueState,
        attributes: savedMap.getAttributes(),
      };
    },
  };
}
