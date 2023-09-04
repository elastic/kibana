/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';

import { CONTENT_ID, LensCrudTypes } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';

const searchArgsToSOFindOptions = (args: LensCrudTypes['SearchIn']): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = args;

  return {
    type: contentTypeId,
    searchFields: ['title^3', 'description'],
    fields: ['description', 'title'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    ...options,
    ...tagsToFindOptions(query.tags),
  };
};

export class LensStorage extends SOContentStorage<LensCrudTypes> {
  constructor() {
    super({
      savedObjectType: CONTENT_ID,
      cmServicesDefinition,
      searchArgsToSOFindOptions,
      enableMSearch: true,
      allowedSavedObjectAttributes: ['title', 'description', 'visualizationType', 'state'],
    });
  }
}
