/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptions,
} from '@kbn/core-saved-objects-api-server';

import { getMSearch, type GetMSearchType } from '@kbn/content-management-utils';

import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type {
  LensSavedObjectAttributes,
  LensSavedObject,
  PartialLensSavedObject,
  LensContentType,
  LensGetOut,
  LensCreateIn,
  LensCreateOut,
  CreateOptions,
  LensUpdateIn,
  LensUpdateOut,
  UpdateOptions,
  LensDeleteOut,
  LensSearchQuery,
  LensSearchOut,
} from '../../common/content_management';

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
  savedObject: SavedObject<LensSavedObjectAttributes>,
  partial: false
): LensSavedObject;

function savedObjectToLensSavedObject(
  savedObject: PartialSavedObject<LensSavedObjectAttributes>,
  partial: true
): PartialLensSavedObject;

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

const SO_TYPE: LensContentType = 'lens';

export class LensStorage implements ContentStorage<LensSavedObject, PartialLensSavedObject> {
  mSearch: GetMSearchType<LensSavedObject>;
  constructor() {
    this.mSearch = getMSearch<LensSavedObject, LensSearchOut>({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      allowedSavedObjectAttributes: ['title', 'description', 'visualizationType', 'state'],
    });
  }

  async get(ctx: StorageContext, id: string): Promise<LensGetOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<LensSavedObjectAttributes>(SO_TYPE, id);

    const response: LensGetOut = {
      item: savedObjectToLensSavedObject(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<LensGetOut, LensGetOut>(
      response
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. Lens does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See LensStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: LensCreateIn['data'],
    options: CreateOptions
  ): Promise<LensCreateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      LensSavedObjectAttributes,
      LensSavedObjectAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      CreateOptions,
      CreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create<LensSavedObjectAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      LensCreateOut,
      LensCreateOut
    >({
      item: savedObjectToLensSavedObject(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: LensUpdateIn['data'],
    options: UpdateOptions
  ): Promise<LensUpdateOut> {
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
      CreateOptions,
      CreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);

    const savedObject = await soClient.create<LensSavedObjectAttributes>(SO_TYPE, dataToLatest, {
      id,
      overwrite: true,
      ...optionsToLatest,
    });

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      LensUpdateOut,
      LensUpdateOut
    >({
      item: savedObjectToLensSavedObject(savedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<LensDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: LensSearchQuery = {}
  ): Promise<LensSearchOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      LensSearchQuery,
      LensSearchQuery
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }
    const { searchFields = ['title^3', 'description'], types = [CONTENT_ID] } = optionsToLatest;

    const { included, excluded } = query.tags ?? {};
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

    const soQuery: SavedObjectsFindOptions = {
      type: types,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? Number(query.cursor) : undefined,
      defaultSearchOperator: 'AND',
      searchFields,
      hasReference,
      hasNoReference,
    };

    // Execute the query in the DB
    const response = await soClient.find<LensSavedObjectAttributes>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      LensSearchOut,
      LensSearchOut
    >({
      hits: response.saved_objects.map((so) => savedObjectToLensSavedObject(so, false)),
      pagination: {
        total: response.total,
      },
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
}
