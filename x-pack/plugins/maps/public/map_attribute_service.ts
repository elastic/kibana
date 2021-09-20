/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/types';
import { AttributeService } from '../../../../src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getMapEmbeddableDisplayName } from '../common/i18n_getters';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { getCoreOverlays, getEmbeddableService, getSavedObjectsClient } from './kibana_services';
import { extractReferences, injectReferences } from '../common/migrations/references';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';
import { getSpacesApi } from './kibana_services';

export interface SharingSavedObjectProps {
  outcome?: 'aliasMatch' | 'exactMatch' | 'conflict';
  aliasTargetId?: string;
  errorJSON?: string;
}

type MapDoc = MapSavedObjectAttributes & {
  sharingSavedObjectProps?: SharingSavedObjectProps;
  references?: SavedObjectReference[];
};

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
      const {
        saved_object: savedObject,
        outcome,
        alias_target_id: aliasTargetId,
      } = await getSavedObjectsClient().resolve<MapSavedObjectAttributes>(
        MAP_SAVED_OBJECT_TYPE,
        savedObjectId
      );

      if (savedObject.error) {
        throw savedObject.error;
      }

      const { attributes } = injectReferences(savedObject);
      return {
        ...attributes,
        references: savedObject.references,
        sharingSavedObjectProps: {
          aliasTargetId,
          outcome,
          errorJSON:
            outcome === 'conflict' && getSpacesApi()
              ? JSON.stringify({
                  targetType: MAP_SAVED_OBJECT_TYPE,
                  sourceId: savedObjectId,
                  targetSpace: (await getSpacesApi()!.getActiveSpace()).id,
                })
              : undefined,
        },
      };
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
