/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/types';
import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import { AttributeService } from '@kbn/embeddable-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { MapAttributes } from '../common/content_management';
import { MAP_EMBEDDABLE_NAME, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getCoreOverlays, getEmbeddableService } from './kibana_services';
import { extractReferences, injectReferences } from '../common/migrations/references';
import { getMapClient, checkForDuplicateTitle } from './content_management';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';

export interface SharingSavedObjectProps {
  outcome?: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
  sourceId?: string;
}

type MapDoc = MapAttributes & {
  references?: SavedObjectReference[];
};
export interface MapUnwrapMetaInfo {
  sharingSavedObjectProps: SharingSavedObjectProps;
  // Is this map managed by the system?
  managed: boolean;
}

export type MapAttributeService = AttributeService<
  MapDoc,
  MapByValueInput,
  MapByReferenceInput,
  MapUnwrapMetaInfo
>;

export const savedObjectToEmbeddableAttributes = (
  savedObject: SavedObjectCommon<MapAttributes>
) => {
  const { attributes } = injectReferences(savedObject);

  return {
    ...attributes,
    references: savedObject.references,
  };
};

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

      const {
        item: { id },
      } = await (savedObjectId
        ? getMapClient().update({
            id: savedObjectId,
            data: updatedAttributes,
            options: { references },
          })
        : getMapClient().create({ data: updatedAttributes, options: { references } }));
      return { id };
    },
    unwrapMethod: async (
      savedObjectId: string
    ): Promise<{
      attributes: MapDoc;
      metaInfo: MapUnwrapMetaInfo;
    }> => {
      const {
        item: savedObject,
        meta: { outcome, aliasPurpose, aliasTargetId },
      } = await getMapClient<MapAttributes>().get(savedObjectId);

      if (savedObject.error) {
        throw savedObject.error;
      }

      return {
        attributes: savedObjectToEmbeddableAttributes(savedObject),
        metaInfo: {
          sharingSavedObjectProps: {
            aliasTargetId,
            outcome,
            aliasPurpose,
            sourceId: savedObjectId,
          },
          managed: Boolean(savedObject.managed),
        },
      };
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      return checkForDuplicateTitle(
        {
          title: props.newTitle,
          copyOnSave: false,
          lastSavedTitle: '',
          isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
          getDisplayName: () => MAP_EMBEDDABLE_NAME,
          onTitleDuplicate: props.onTitleDuplicate,
        },
        {
          overlays: getCoreOverlays(),
        }
      );
    },
  });

  return mapAttributeService;
}
