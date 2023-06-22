/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchQuery } from '@kbn/content-management-plugin/common';

import type {
  MapGetIn,
  MapGetOut,
  MapCreateIn,
  MapCreateOut,
  MapUpdateIn,
  MapUpdateOut,
  MapDeleteIn,
  MapDeleteOut,
  MapSearchIn,
  MapSearchOut,
  MapSearchOptions,
} from '../../common/content_management';
import { CONTENT_ID as contentTypeId } from '../../common/content_management';
import { getContentManagement } from '../kibana_services';

const get = async (id: string) => {
  return getContentManagement().client.get<MapGetIn, MapGetOut>({
    contentTypeId,
    id,
  });
};

const create = async ({ data, options }: Omit<MapCreateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.create<MapCreateIn, MapCreateOut>({
    contentTypeId,
    data,
    options,
  });
  return res;
};

const update = async ({ id, data, options }: Omit<MapUpdateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.update<MapUpdateIn, MapUpdateOut>({
    contentTypeId,
    id,
    data,
    options,
  });
  return res;
};

const deleteMap = async (id: string) => {
  await getContentManagement().client.delete<MapDeleteIn, MapDeleteOut>({
    contentTypeId,
    id,
  });
};

const search = async (query: SearchQuery = {}, options?: MapSearchOptions) => {
  return getContentManagement().client.search<MapSearchIn, MapSearchOut>({
    contentTypeId,
    query,
    options,
  });
};

export const mapsClient = {
  get,
  create,
  update,
  delete: deleteMap,
  search,
};
