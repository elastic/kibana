/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';

import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import type { MapGetIn, MapCreateIn, MapContentType } from '../../common/poc_content_management';

const getSavedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

const SO_TYPE: MapContentType = 'map';

export class MapsStorage implements ContentStorage {
  constructor() {}

  async get(ctx: StorageContext, id: string, options: MapGetIn['options']): Promise<any> {
    const soClient = await getSavedObjectClientFromRequest(ctx);
    return soClient.resolve(SO_TYPE, id);
  }

  async create(
    ctx: StorageContext,
    attributes: MapSavedObjectAttributes,
    options: MapCreateIn['options']
  ): Promise<any> {
    const { migrationVersion, coreMigrationVersion, references, overwrite } = options!;

    const createOptions = {
      overwrite,
      migrationVersion,
      coreMigrationVersion,
      references,
    };

    const soClient = await getSavedObjectClientFromRequest(ctx);
    return soClient.create(SO_TYPE, attributes, createOptions);
  }
}
