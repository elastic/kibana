/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type {
  ContentStorage,
  StorageContext,
  MSearchConfig,
} from '@kbn/content-management-plugin/server';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';

import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type {
  MapItem,
  PartialMapItem,
  MapContentType,
  MapAttributes,
  MapGetOut,
  MapCreateIn,
  MapCreateOut,
  MapCreateOptions,
  MapUpdateIn,
  MapUpdateOut,
  MapUpdateOptions,
  MapDeleteOut,
  MapSearchOptions,
  MapSearchOut,
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

function savedObjectToMapItem(savedObject: SavedObject<MapAttributes>, partial: false): MapItem;

function savedObjectToMapItem(
  savedObject: PartialSavedObject<MapAttributes>,
  partial: true
): PartialMapItem;

function savedObjectToMapItem(
  savedObject: SavedObject<MapAttributes> | PartialSavedObject<MapAttributes>
): MapItem | PartialMapItem {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: { title, description, layerListJSON, mapStateJSON, uiStateJSON },
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
      layerListJSON,
      mapStateJSON,
      uiStateJSON,
    },
    references,
    error,
    namespaces,
  };
}

const SO_TYPE: MapContentType = 'map';

export class MapsStorage
  implements ContentStorage<MapItem, PartialMapItem, MSearchConfig<MapItem, MapAttributes>>
{
  constructor() {}

  async get(ctx: StorageContext, id: string): Promise<MapGetOut> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<MapAttributes>(SO_TYPE, id);

    const response: MapGetOut = {
      item: savedObjectToMapItem(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<MapGetOut, MapGetOut>(
      response
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. Maps does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See MapsStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: MapCreateIn['data'],
    options: MapCreateOptions
  ): Promise<MapCreateOut> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      MapAttributes,
      MapAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      MapCreateOptions,
      MapCreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create<MapAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      MapCreateOut,
      MapCreateOut
    >({
      item: savedObjectToMapItem(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: MapUpdateIn['data'],
    options: MapUpdateOptions
  ): Promise<MapUpdateOut> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      MapAttributes,
      MapAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      MapCreateOptions,
      MapCreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const partialSavedObject = await soClient.update<MapAttributes>(
      SO_TYPE,
      id,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      MapUpdateOut,
      MapUpdateOut
    >({
      item: savedObjectToMapItem(partialSavedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<MapDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: MapSearchOptions = {}
  ): Promise<MapSearchOut> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      MapSearchOptions,
      MapSearchOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }
    const { onlyTitle = false } = optionsToLatest;

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
      type: CONTENT_ID,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? +query.cursor : undefined,
      defaultSearchOperator: 'AND',
      searchFields: onlyTitle ? ['title'] : ['title^3', 'description'],
      fields: ['description', 'title'],
      hasReference,
      hasNoReference,
    };

    // Execute the query in the DB
    const response = await soClient.find<MapAttributes>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      MapSearchOut,
      MapSearchOut
    >({
      hits: response.saved_objects.map((so) => savedObjectToMapItem(so, false)),
      pagination: {
        total: response.total,
      },
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  // Configure `mSearch` to opt-in maps into the multi content type search API
  mSearch = {
    savedObjectType: SO_TYPE,
    toItemResult: (
      ctx: StorageContext,
      savedObject: SavedObjectsFindResult<MapAttributes>
    ): MapItem => {
      const {
        utils: { getTransforms },
      } = ctx;
      const transforms = getTransforms(cmServicesDefinition);

      // Validate DB response and DOWN transform to the request version
      const { value, error: resultError } = transforms.mSearch.out.result.down<MapItem, MapItem>(
        savedObjectToMapItem(savedObject, false)
      );

      if (resultError) {
        throw Boom.badRequest(`Invalid response. ${resultError.message}`);
      }

      return value;
    },
  };
}
