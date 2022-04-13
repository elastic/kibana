/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/types';
import type { SavedObjectsResolveResponse } from 'src/core/public';
import { AttributeService } from '../../../../src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getMapEmbeddableDisplayName } from '../common/i18n_getters';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';
import { getCoreOverlays, getEmbeddableService, getSavedObjectsClient } from './kibana_services';
import { extractReferences, injectReferences } from '../common/migrations/references';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';

export interface SharingSavedObjectProps {
  outcome?: SavedObjectsResolveResponse['outcome'];
  aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
  sourceId?: string;
}

type MapDoc = MapSavedObjectAttributes & {
  references?: SavedObjectReference[];
};
export interface MapUnwrapMetaInfo {
  sharingSavedObjectProps: SharingSavedObjectProps;
}

export type MapAttributeService = AttributeService<
  MapDoc,
  MapByValueInput,
  MapByReferenceInput,
  MapUnwrapMetaInfo
>;

let mapAttributeService: MapAttributeService | null = null;

export function getMapAttributeService(): MapAttributeService {
  if (mapAttributeService) {
    return mapAttributeService;
  }

  mapAttributeService = getEmbeddableService().getAttributeService<
    MapDoc,
    MapByValueInput,
    MapByReferenceInput,
    MapUnwrapMetaInfo
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
    unwrapMethod: async (
      savedObjectId: string
    ): Promise<{
      attributes: MapDoc;
      metaInfo: MapUnwrapMetaInfo;
    }> => {
      const {
        saved_object: savedObject,
        outcome,
        alias_target_id: aliasTargetId,
        alias_purpose: aliasPurpose,
      } = await getSavedObjectsClient().resolve<MapSavedObjectAttributes>(
        MAP_SAVED_OBJECT_TYPE,
        savedObjectId
      );

      if (savedObject.error) {
        throw savedObject.error;
      }

      const { attributes } = injectReferences(savedObject);
      return {
        attributes: {
          ...attributes,
          references: savedObject.references,
        },
        metaInfo: {
          sharingSavedObjectProps: {
            aliasTargetId,
            outcome,
            aliasPurpose,
            sourceId: savedObjectId,
          },
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
