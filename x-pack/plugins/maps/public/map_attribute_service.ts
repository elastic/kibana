/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectReference } from '../../../../src/core/types/saved_objects';
import { AttributeService } from '../../../../src/plugins/embeddable/public/lib/attribute_service/attribute_service';
import { checkForDuplicateTitle } from '../../../../src/plugins/saved_objects/public/saved_object/helpers/check_for_duplicate_title';
import type { OnSaveProps } from '../../../../src/plugins/saved_objects/public/save_modal/saved_object_save_modal';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getMapEmbeddableDisplayName } from '../common/i18n_getters';
import type { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { extractReferences, injectReferences } from '../common/migrations/references';
import type { MapByReferenceInput, MapByValueInput } from './embeddable/types';
import { getCoreOverlays, getEmbeddableService, getSavedObjectsClient } from './kibana_services';

type MapDoc = MapSavedObjectAttributes & { references?: SavedObjectReference[] };

export type MapAttributeService = AttributeService<MapDoc, MapByValueInput, MapByReferenceInput>;

let mapAttributeService: MapAttributeService | null = null;

export function getMapAttributeService(): MapAttributeService {
  if (mapAttributeService) {
    return mapAttributeService;
  }

  mapAttributeService = getEmbeddableService().getAttributeService<
    MapDoc,
    MapByValueInput,
    MapByReferenceInput
  >(MAP_SAVED_OBJECT_TYPE, {
    saveMethod: async (attributes: MapDoc, savedObjectId?: string) => {
      // AttributeService "attributes" contains "references" as a child.
      // SavedObjectClient "attributes" uses "references" as a sibling.
      // https://github.com/elastic/kibana/issues/83133
      const savedObjectClientReferences = attributes.references;
      const savedObjectClientAttributes = { ...attributes };
      delete savedObjectClientAttributes.references;
      const { attributes: updatedAttributes, references } = extractReferences({
        attributes: savedObjectClientAttributes,
        references: savedObjectClientReferences,
      });

      const savedObject = await (savedObjectId
        ? getSavedObjectsClient().update<MapSavedObjectAttributes>(
            MAP_SAVED_OBJECT_TYPE,
            savedObjectId,
            updatedAttributes,
            { references }
          )
        : getSavedObjectsClient().create<MapSavedObjectAttributes>(
            MAP_SAVED_OBJECT_TYPE,
            updatedAttributes,
            { references }
          ));
      return { id: savedObject.id };
    },
    unwrapMethod: async (savedObjectId: string): Promise<MapDoc> => {
      const savedObject = await getSavedObjectsClient().get<MapSavedObjectAttributes>(
        MAP_SAVED_OBJECT_TYPE,
        savedObjectId
      );

      if (savedObject.error) {
        throw savedObject.error;
      }

      const { attributes } = injectReferences(savedObject);
      return { ...attributes, references: savedObject.references };
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
