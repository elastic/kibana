/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import { SOContentStorage, tagsToFindOptions } from '@kbn/content-management-utils';
import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';

import {
  CONTENT_ID,
  type LensCrudTypes,
  type LensSavedObject,
  type LensSavedObjectAttributes,
  type PartialLensSavedObject,
} from '../../common/content_management';
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

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

function savedObjectToLensSavedObject(
  savedObject:
    | SavedObject<LensSavedObjectAttributes>
    | PartialSavedObject<LensSavedObjectAttributes>
): LensSavedObject | PartialLensSavedObject {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: { title, description, state, visualizationType },
    references,
    error,
    namespaces,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    createdAt,
    attributes: {
      title,
      description,
      visualizationType,
      state,
    },
    references,
    error,
    namespaces,
  };
}

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

  /**
   * Lens requires a custom update function because of https://github.com/elastic/kibana/issues/160116
   * where a forced create with overwrite flag is used instead of regular update
   */
  async update(
    ctx: StorageContext,
    id: string,
    data: LensCrudTypes['UpdateIn']['data'],
    options: LensCrudTypes['UpdateOptions']
  ): Promise<LensCrudTypes['UpdateOut']> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      LensSavedObjectAttributes,
      LensSavedObjectAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      LensCrudTypes['CreateOptions'],
      LensCrudTypes['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);

    const savedObject = await soClient.create<LensSavedObjectAttributes>(CONTENT_ID, dataToLatest, {
      id,
      overwrite: true,
      ...optionsToLatest,
    });

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      LensCrudTypes['UpdateOut'],
      LensCrudTypes['UpdateOut']
    >({
      item: savedObjectToLensSavedObject(savedObject),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
}
