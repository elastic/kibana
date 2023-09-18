/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  SerializableAttributes,
  VisualizationClient,
} from '@kbn/visualizations-plugin/public';
import { DOC_TYPE } from '../../common/constants';
import {
  LensCreateIn,
  LensCreateOut,
  LensDeleteIn,
  LensDeleteOut,
  LensGetIn,
  LensGetOut,
  LensSearchIn,
  LensSearchOut,
  LensSearchQuery,
  LensUpdateIn,
  LensUpdateOut,
} from '../../common/content_management';

export function getLensClient<Attr extends SerializableAttributes = SerializableAttributes>(
  cm: ContentManagementPublicStart
): VisualizationClient<'lens', Attr> {
  const get = async (id: string) => {
    return cm.client.get<LensGetIn, LensGetOut>({
      contentTypeId: DOC_TYPE,
      id,
    });
  };

  const create = async ({ data, options }: Omit<LensCreateIn, 'contentTypeId'>) => {
    const res = await cm.client.create<LensCreateIn, LensCreateOut>({
      contentTypeId: DOC_TYPE,
      data,
      options,
    });
    return res;
  };

  const update = async ({ id, data, options }: Omit<LensUpdateIn, 'contentTypeId'>) => {
    const res = await cm.client.update<LensUpdateIn, LensUpdateOut>({
      contentTypeId: DOC_TYPE,
      id,
      data,
      options,
    });
    return res;
  };

  const deleteLens = async (id: string) => {
    const res = await cm.client.delete<LensDeleteIn, LensDeleteOut>({
      contentTypeId: DOC_TYPE,
      id,
    });
    return res;
  };

  const search = async (query: SearchQuery = {}, options?: LensSearchQuery) => {
    return cm.client.search<LensSearchIn, LensSearchOut>({
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
  } as unknown as VisualizationClient<'lens', Attr>;
}
