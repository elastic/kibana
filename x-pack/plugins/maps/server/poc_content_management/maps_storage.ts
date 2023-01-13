/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ContentStorage } from '@kbn/content-management-plugin/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';

type MapsUniqueFields = Pick<
  MapSavedObjectAttributes,
  'layerListJSON' | 'mapStateJSON' | 'uiStateJSON'
>;

export class MapsStorage implements ContentStorage<MapsUniqueFields> {
  constructor() {}

  async get(
    id: string,
    options: {
      requestHandlerContext: RequestHandlerContext;
    }
  ): Promise<any> {
    const { savedObjects } = await options.requestHandlerContext.core;
    const object = await savedObjects.client.get('map', id);
    return object;
  }

  // TODO: type the payload + response
  async create(
    payload: any,
    options: {
      requestHandlerContext: RequestHandlerContext;
      overwrite?: boolean;
    }
  ): Promise<any> {
    const { attributes, migrationVersion, coreMigrationVersion, references, initialNamespaces } =
      payload;

    const createOptions = {
      overwrite: options.overwrite,
      migrationVersion,
      coreMigrationVersion,
      references,
      initialNamespaces,
    };

    const { savedObjects } = await options.requestHandlerContext.core;
    const result = await savedObjects.client.create('map', attributes, createOptions);

    return result;
  }
}
