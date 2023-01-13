/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ContentStorage } from '@kbn/content-management-plugin/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-browser';

import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';

const SO_TYPE = 'map';
export class MapsStorage implements ContentStorage {
  constructor() {}

  async get(
    id: string,
    options: {
      requestHandlerContext: RequestHandlerContext;
    }
  ): Promise<any> {
    const { savedObjects } = await options.requestHandlerContext.core;
    const object = await savedObjects.client.get(SO_TYPE, id);
    return object;
  }

  async create(
    attributes: MapSavedObjectAttributes,
    options: {
      requestHandlerContext: RequestHandlerContext;
    } & Pick<
      SavedObjectsCreateOptions,
      'migrationVersion' | 'coreMigrationVersion' | 'references' | 'overwrite'
    >
  ): Promise<any> {
    const { migrationVersion, coreMigrationVersion, references, overwrite } = options;

    const createOptions = {
      overwrite,
      migrationVersion,
      coreMigrationVersion,
      references,
    };

    const { savedObjects } = await options.requestHandlerContext.core;
    const result = await savedObjects.client.create(SO_TYPE, attributes, createOptions);

    return result;
  }
}
