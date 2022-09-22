/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Pagination } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';

import type {
  Pagination as ServerPagination,
  ExceptionListSchema,
  ListArray,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { fetchExceptionListsItemsByListIds } from '@kbn/securitysolution-list-api';
import { transformInput } from '@kbn/securitysolution-list-hooks';
import { findRuleExceptionReferences } from '../../../../detections/containers/detection_engine/rules';
import type { GetExceptionItemProps } from '../../components/list_common';

interface FetchItemsProps {
  http: HttpSetup | undefined;
  listIds: string[];
  namespaceTypes: NamespaceType[];
  pagination: Pagination | undefined;
  search?: string;
  filter?: string;
}

export const prepareFetchExceptionItemsParams = (
  exceptions: ListArray | null,
  list: ExceptionListSchema | null,
  options?: GetExceptionItemProps
) => {
  const { pagination, search, filters } = options || {};
  let listIds: string[] = [];
  let namespaceTypes: NamespaceType[] = [];

  if (Array.isArray(exceptions) && exceptions.length) {
    listIds = exceptions.map((excList) => excList.list_id);
    namespaceTypes = exceptions.map((excList) => excList.namespace_type);
  } else if (list) {
    listIds = [list.list_id];
    namespaceTypes = [list.namespace_type];
  }

  return {
    listIds,
    namespaceTypes,
    pagination,
    search,
    filters,
  };
};

export const fetchListExceptionItems = async ({
  namespaceTypes,
  listIds,
  http,
  pagination,
  search,
}: FetchItemsProps) => {
  try {
    const abortCtrl = new AbortController();
    const {
      pageIndex: inputPageIndex,
      pageSize: inputPageSize,
      totalItemCount: inputTotalItemCount,
    } = pagination || {};

    const {
      page: pageIndex,
      per_page: pageSize,
      total: totalItemCount,
      data,
    } = await fetchExceptionListsItemsByListIds({
      filter: undefined,
      http: http as HttpSetup,
      listIds: listIds ?? [],
      namespaceTypes: namespaceTypes ?? [],
      search,
      pagination: {
        perPage: inputPageSize,
        page: inputPageIndex || 0 + 1,
        total: inputTotalItemCount,
      } as ServerPagination,
      signal: abortCtrl.signal,
    });

    // Please see `x-pack/plugins/lists/public/exceptions/transforms.ts` doc notes
    // for context around the temporary `id`
    const transformedData = data.map((item) => transformInput(item));

    return {
      data: transformedData,
      pagination: { pageIndex: pageIndex - 1, pageSize, totalItemCount },
    };
  } catch (error) {
    throw new Error(error);
  }
};

export const getExceptionItemsReferences = async (list: ExceptionListSchema) => {
  try {
    const abortCtrl = new AbortController();

    const { references } = await findRuleExceptionReferences({
      lists: [list].map((listInput) => ({
        id: listInput.id,
        listId: listInput.list_id,
        namespaceType: listInput.namespace_type,
      })),
      signal: abortCtrl.signal,
    });

    return references.reduce((acc, result) => {
      const [[key, value]] = Object.entries(result);
      acc[key] = value;
      return acc;
    }, {});
  } catch (error) {
    throw new Error(error);
  }
};
