/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AttributeService } from '../../../../src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { getCoreOverlays, getEmbeddableService, getSavedObjectsClient } from './kibana_services';
// @ts-expect-error
import { extractReferences, injectReferences } from '../common/migrations/references';

export type MapAttributeService = AttributeService<
  MapSavedObjectAttributes,
  MapByValueInput,
  MapByReferenceInput
>;

export function getMapAttributeService(): MapAttributeService {
  return getEmbeddableService().getAttributeService<
    MapSavedObjectAttributes,
    MapByValueInput,
    MapByReferenceInput
  >(MAP_SAVED_OBJECT_TYPE, {
    saveMethod: async (
      type: string,
      attributes: MapSavedObjectAttributes,
      savedObjectId?: string
    ) => {
      throw new Error('saveMethod not implemented');
      /* const savedDoc = await savedObjectStore.save({
        ...attributes,
        savedObjectId,
        type: MAP_SAVED_OBJECT_TYPE,
      });
      return { id: savedDoc.savedObjectId };*/
    },
    unwrapMethod: async (savedObjectId: string): Promise<MapSavedObjectAttributes> => {
      const savedObject = await getSavedObjectsClient().get<MapSavedObjectAttributes>(
        MAP_SAVED_OBJECT_TYPE,
        savedObjectId
      );

      const { attributes } = injectReferences(savedObject);
      return attributes;
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      return checkForDuplicateTitle(
        {
          title: props.newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          getEsType: () => MAP_SAVED_OBJECT_TYPE,
          getDisplayName: () => MAP_SAVED_OBJECT_TYPE,
        },
        props.isTitleDuplicateConfirmed,
        props.onTitleDuplicate,
        {
          savedObjectsClient: getSavedObjectsClient(),
          overlays: getCoreOverlays(),
        }
      );
    },
  });
}
