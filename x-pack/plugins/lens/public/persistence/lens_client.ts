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
import type { LensCrudTypes, LensSearchQuery } from '../../common/content_management';

export const [getContentManagement, setContentManagement] =
  createGetterSetter<ContentManagementPublicStart>('SavedObjectsManagement');

export function lensClientFactory(cm: ContentManagementPublicStart = getContentManagement()) {
  const get = async (id: string) => {
    return cm.client.get<LensCrudTypes['GetIn'], LensCrudTypes['GetOut']>({
      contentTypeId: DOC_TYPE,
      id,
    });
  };

  const create = async ({ data, options }: Omit<LensCrudTypes['CreateIn'], 'contentTypeId'>) => {
    const res = await cm.client.create<LensCrudTypes['CreateIn'], LensCrudTypes['CreateOut']>({
      contentTypeId: DOC_TYPE,
      data,
      options,
    });
    return res;
  };

  const update = async ({
    id,
    data,
    options,
  }: Omit<LensCrudTypes['UpdateIn'], 'contentTypeId'>) => {
    const res = await cm.client.update<LensCrudTypes['UpdateIn'], LensCrudTypes['UpdateOut']>({
      contentTypeId: DOC_TYPE,
      id,
      data,
      options,
    });
    return res;
  };

  const deleteLens = async (id: string) => {
    const res = await cm.client.delete<LensCrudTypes['DeleteIn'], LensCrudTypes['DeleteOut']>({
      contentTypeId: DOC_TYPE,
      id,
    });
    return res;
  };

  const search = async (query: SearchQuery = {}, options?: LensSearchQuery) => {
    return cm.client.search<LensCrudTypes['SearchIn'], LensCrudTypes['SearchOut']>({
      contentTypeId: DOC_TYPE,
      query,
      options,
    });
  };

  return {
    get,
    create,
    update,
    delete: deleteLens,
    search,
  };
}
