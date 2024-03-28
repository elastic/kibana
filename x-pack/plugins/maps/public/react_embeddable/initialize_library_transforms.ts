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
    saveStateToSavedObject: async (title: string) => {
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
      const { attributes, ...byRefState } = state.rawState ?? {};
      return {
        state: {
          ...byRefState,
          savedObjectId,
        },
        savedObjectId,
      };
    },
    checkForDuplicateTitle: async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      checkForDuplicateTitle(
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
    savedObjectAttributesToState: () => {
      const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
      return {
        ...byValueState,
        attributes: savedMap.getAttributes(),
      };
    },
  };
}
