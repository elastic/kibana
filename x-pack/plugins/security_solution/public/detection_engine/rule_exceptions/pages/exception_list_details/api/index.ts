/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Pagination as ServerPagination,
  ExceptionListSchema,
  ListArray,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  deleteExceptionListById,
  deleteExceptionListItemById,
  exportExceptionList,
  fetchExceptionListsItemsByListIds,
  updateExceptionList,
} from '@kbn/securitysolution-list-api';
import { transformInput } from '@kbn/securitysolution-list-hooks';
import type {
  GetExceptionItemProps,
  RuleReferences,
} from '@kbn/securitysolution-exception-list-components';
import type { HttpSetup } from '@kbn/core-http-browser';
import { findRuleExceptionReferences } from '../../../../rule_management/api/api';
import type {
  DeleteExceptionItem,
  DeleteExceptionList,
  ExportExceptionList,
  FetchItems,
  UpdateExceptionList,
} from './types';
import type { ExceptionListWithRules } from '../types';

export const prepareFetchExceptionItemsParams = (
  exceptions: ListArray | null,
  list: ExceptionListWithRules | null,
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
}: FetchItems) => {
  try {
    const abortCtrl = new AbortController();
    const {
      pageIndex: inputPageIndex,
      pageSize: inputPageSize,
      totalItemCount: inputTotalItemCount,
    } = pagination || {};

    // TODO transform Pagination object from Frontend=>Backend & <=
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
        page: (inputPageIndex || 0) + 1,
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

    return references.reduce<RuleReferences>((acc, reference) => {
      return { ...acc, ...reference } as RuleReferences;
    }, {});
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteExceptionListItem = async ({ id, namespaceType, http }: DeleteExceptionItem) => {
  try {
    const abortCtrl = new AbortController();
    await deleteExceptionListItemById({
      http: http as HttpSetup,
      id,
      namespaceType,
      signal: abortCtrl.signal,
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const updateList = async ({ list, http }: UpdateExceptionList) => {
  try {
    const abortCtrl = new AbortController();
    await updateExceptionList({
      http: http as HttpSetup,
      list,
      signal: abortCtrl.signal,
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const exportList = async ({ id, listId, http, namespaceType }: ExportExceptionList) => {
  try {
    const abortCtrl = new AbortController();
    return await exportExceptionList({
      id,
      http: http as HttpSetup,
      listId,
      signal: abortCtrl.signal,
      namespaceType,
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteList = async ({ id, http, namespaceType }: DeleteExceptionList) => {
  try {
    const abortCtrl = new AbortController();
    await deleteExceptionListById({
      id,
      http: http as HttpSetup,
      signal: abortCtrl.signal,
      namespaceType,
    });
  } catch (error) {
    throw new Error(error);
  }
};
