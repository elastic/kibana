/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AttributeService } from '../../../../src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getMapEmbeddableDisplayName } from '../common/i18n_getters';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { getCoreOverlays, getEmbeddableService, getSavedObjectsClient } from './kibana_services';
// @ts-expect-error
import { extractReferences, injectReferences } from '../common/migrations/references';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';

export type MapAttributeService = AttributeService<
  MapSavedObjectAttributes,
  MapByValueInput,
  MapByReferenceInput
>;

let mapAttributeService: MapAttributeService | null = null;

export function getMapAttributeService(): MapAttributeService {
  if (mapAttributeService) {
    return mapAttributeService;
  }

  mapAttributeService = getEmbeddableService().getAttributeService<
    MapSavedObjectAttributes,
    MapByValueInput,
    MapByReferenceInput
  >(MAP_SAVED_OBJECT_TYPE, {
    saveMethod: async (attributes: MapSavedObjectAttributes, savedObjectId?: string) => {
      const { attributes: attributesWithExtractedReferences, references } = extractReferences({
        attributes,
      });

      const savedObject = await (savedObjectId
        ? getSavedObjectsClient().update<MapSavedObjectAttributes>(
            MAP_SAVED_OBJECT_TYPE,
            savedObjectId,
            attributesWithExtractedReferences,
            { references }
          )
        : getSavedObjectsClient().create<MapSavedObjectAttributes>(
            MAP_SAVED_OBJECT_TYPE,
            attributesWithExtractedReferences,
            { references }
          ));
      return { id: savedObject.id };
    },
    unwrapMethod: async (savedObjectId: string): Promise<MapSavedObjectAttributes> => {
      const savedObject = await getSavedObjectsClient().get<MapSavedObjectAttributes>(
        MAP_SAVED_OBJECT_TYPE,
        savedObjectId
      );

      if (savedObject.error) {
        throw savedObject.error;
      }

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
          getDisplayName: getMapEmbeddableDisplayName,
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

  return mapAttributeService;
}
