/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/types';
import { ResolvedSimpleSavedObject } from 'kibana/public';
import { AttributeService } from '../../../../src/plugins/embeddable/public';
import { MapSavedObjectAttributes } from '../common/map_saved_object_type';
import { MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { getSavedObjectsClient } from './kibana_services';
import { injectReferences } from '../common/migrations/references';
import { MapByValueInput, MapByReferenceInput } from './embeddable/types';

type MapDoc = MapSavedObjectAttributes & {
  references?: SavedObjectReference[];
};

export type MapAttributeService = AttributeService<MapDoc, MapByValueInput, MapByReferenceInput>;

let resolveResult: ResolvedSimpleSavedObject<MapSavedObjectAttributes> | undefined;
export async function resolveSavedObject(
  savedObjectId: string
): Promise<{
  mapDoc: MapDoc;
  resolvedSavedObject: ResolvedSimpleSavedObject<MapSavedObjectAttributes>;
}> {
  if (!resolveResult || resolveResult.saved_object.id !== savedObjectId) {
    resolveResult = await getSavedObjectsClient().resolve<MapSavedObjectAttributes>(
      MAP_SAVED_OBJECT_TYPE,
      savedObjectId
    );
  }
  const savedObject = resolveResult.saved_object;

  if (savedObject.error) {
    throw savedObject.error;
  }

  const { attributes } = injectReferences(savedObject);
  return {
    mapDoc: { ...attributes, references: savedObject.references },
    resolvedSavedObject: resolveResult,
  };
}
