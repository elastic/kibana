/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import { DOC_TYPE } from '../../common/constants';
import type {
  LensCreateIn,
  LensCreateOut,
  LensGetIn,
  LensGetOut,
  LensSearchIn,
  LensSearchOut,
  LensSearchQuery,
  LensUpdateIn,
  LensUpdateOut,
  LensDeleteIn,
  LensDeleteOut,
} from '../../common/content_management';

export const [getContentManagement, setContentManagement] =
  createGetterSetter<ContentManagementPublicStart>('SavedObjectsManagement');

const get = async (id: string) => {
  return getContentManagement().client.get<LensGetIn, LensGetOut>({
    contentTypeId: DOC_TYPE,
    id,
  });
};

const create = async ({ data, options }: Omit<LensCreateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.create<LensCreateIn, LensCreateOut>({
    contentTypeId: DOC_TYPE,
    data,
    options,
  });
  return res;
};

const update = async ({ id, data, options }: Omit<LensUpdateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.update<LensUpdateIn, LensUpdateOut>({
    contentTypeId: DOC_TYPE,
    id,
    data,
    options,
  });
  return res;
};

const deleteLens = async (id: string) => {
  const res = await getContentManagement().client.delete<LensDeleteIn, LensDeleteOut>({
    contentTypeId: DOC_TYPE,
    id,
  });
  return res;
};

const search = async (query: SearchQuery = {}, options?: LensSearchQuery) => {
  return getContentManagement().client.search<LensSearchIn, LensSearchOut>({
    contentTypeId: DOC_TYPE,
    query,
    options,
  });
};

export const lensClient = {
  get,
  create,
  update,
  delete: deleteLens,
  search,
};
