/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';
import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type { MapCrudTypes } from '../../common/content_management';

const searchArgsToSOFindOptions = (args: MapCrudTypes['SearchIn']): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = args;

  return {
    type: contentTypeId,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: ['description', 'title'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    ...tagsToFindOptions(query.tags),
  };
};

export class MapsStorage extends SOContentStorage<MapCrudTypes> {
  constructor() {
    super({
      savedObjectType: CONTENT_ID,
      cmServicesDefinition,
      searchArgsToSOFindOptions,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'mapStateJSON',
        'layerListJSON',
        'uiStateJSON',
      ],
    });
  }
}
