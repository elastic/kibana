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

import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type {
  GraphSavedObjectAttributes,
  GraphSavedObject,
  PartialGraphSavedObject,
  GraphGetOut,
  GraphCreateIn,
  GraphCreateOut,
  CreateOptions,
  GraphUpdateIn,
  GraphUpdateOut,
  UpdateOptions,
  GraphDeleteOut,
  GraphSearchQuery,
  GraphSearchOut,
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

function savedObjectToGraphSavedObject(
  savedObject: SavedObject<GraphSavedObjectAttributes>,
  partial: false
): GraphSavedObject;

function savedObjectToGraphSavedObject(
  savedObject: PartialSavedObject<GraphSavedObjectAttributes>,
  partial: true
): PartialGraphSavedObject;

function savedObjectToGraphSavedObject(
  savedObject:
    | SavedObject<GraphSavedObjectAttributes>
    | PartialSavedObject<GraphSavedObjectAttributes>
): GraphSavedObject | PartialGraphSavedObject {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: {
      title,
      description,
      version,
      kibanaSavedObjectMeta,
      wsState,
      numVertices,
      numLinks,
      legacyIndexPatternRef,
    },
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
      kibanaSavedObjectMeta,
      wsState,
      version,
      numLinks,
      numVertices,
      legacyIndexPatternRef,
    },
    references,
    error,
    namespaces,
  };
}

const SO_TYPE = 'graph-workspace';

export class GraphStorage implements ContentStorage<GraphSavedObject, PartialGraphSavedObject> {
  constructor() {}

  async get(ctx: StorageContext, id: string): Promise<GraphGetOut> {
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
    } = await soClient.resolve<GraphSavedObjectAttributes>(SO_TYPE, id);

    const response: GraphGetOut = {
      item: savedObjectToGraphSavedObject(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<GraphGetOut, GraphGetOut>(
      response
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. Graph does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See GraphStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: GraphCreateIn['data'],
    options: CreateOptions
  ): Promise<GraphCreateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      GraphSavedObjectAttributes,
      GraphSavedObjectAttributes
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
    const savedObject = await soClient.create<GraphSavedObjectAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      GraphCreateOut,
      GraphCreateOut
    >({
      item: savedObjectToGraphSavedObject(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: GraphUpdateIn['data'],
    options: UpdateOptions
  ): Promise<GraphUpdateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      GraphSavedObjectAttributes,
      GraphSavedObjectAttributes
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
    const partialSavedObject = await soClient.update<GraphSavedObjectAttributes>(
      SO_TYPE,
      id,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      GraphUpdateOut,
      GraphUpdateOut
    >({
      item: savedObjectToGraphSavedObject(partialSavedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<GraphDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: GraphSearchQuery = {}
  ): Promise<GraphSearchOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      GraphSearchQuery,
      GraphSearchQuery
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }
    const { searchFields = ['title^3', 'description'], types = ['graph-workspace'] } =
      optionsToLatest;

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
    const response = await soClient.find<GraphSavedObjectAttributes>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      GraphSearchOut,
      GraphSearchOut
    >({
      hits: response.saved_objects.map((so) => savedObjectToGraphSavedObject(so, false)),
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
