/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type { MapCrudTypes } from '../../common/content_management';

const searchArgsToSOFindOptions = (args: MapCrudTypes['SearchIn']): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = args;
  const { included, excluded } = query.tags || {};

  // todo find a way to reuse this code
  const hasReference: SavedObjectsFindOptions['hasReference'] = included
    ? included.map((id) => ({
        id,
        type: 'tag',
      }))
    : undefined;

  const hasNoReference: SavedObjectsFindOptions['hasNoReference'] = excluded
    ? excluded.map((id) => ({
        id,
        type: 'tag',
      }))
    : undefined;

  return {
    type: contentTypeId,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: ['description', 'title'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    hasReference,
    hasNoReference,
  };
};

export class MapsStorage extends SOContentStorage<MapCrudTypes> {
  constructor() {
    super({
      savedObjectType: CONTENT_ID,
      cmServicesDefinition,
      searchArgsToSOFindOptions,
      enableMSearch: true,
    });
  }
}
