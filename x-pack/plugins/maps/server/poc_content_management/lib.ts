/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import type { KibanaContent } from '@kbn/content-management-plugin/common';

import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';

/**
 * Handler to convert a "map" saved object to a KibanaContent
 * This handler is called before indexing the map into the Search index
 *
 * @param map A map saved object
 * @returns a Kibana content
 */
export const savedObjectToKibanaContent = (
  map: SimpleSavedObject<MapSavedObjectAttributes>
): KibanaContent => {
  return {
    id: map.id,
    type: map.type,
    title: map.attributes.title,
    description: map.attributes.description,
    meta: {
      /* @ts-ignore the TS interface returned is not really a SimpleSavedObject */
      updatedAt: map.updatedAt ?? map.updated_at,
      /* @ts-ignore the TS interface returned is not really a SimpleSavedObject */
      createdAt: map.createdAt ?? map.created_at!,
      updatedBy: { $id: 'foo' },
      createdBy: { $id: 'bar' },
    },
  };
};
