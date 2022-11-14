/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteExceptionListById,
  exportExceptionList,
  fetchExceptionLists,
  updateExceptionList,
} from '@kbn/securitysolution-list-api';

import type { HttpSetup } from '@kbn/core-http-browser';
import { getFilters } from '@kbn/securitysolution-list-utils';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';
import type {
  DeleteExceptionList,
  ExportExceptionList,
  FetchListById,
  UpdateExceptionList,
} from './types';
import { fetchRules } from '../../detection_engine/rule_management/api/api';
import type { Rule } from '../../detection_engine/rule_management/logic';

export const getListById = async ({ id, http }: FetchListById) => {
  try {
    const abortCtrl = new AbortController();
    const filters = getFilters({
      filters: { list_id: id },
      namespaceTypes: ['single', 'agnostic'],
      hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
    });
    const namespaceTypes = ['single', 'agnostic'].join();

    const { data } = await fetchExceptionLists({
      filters,
      http: http as HttpSetup,
      signal: abortCtrl.signal,
      namespaceTypes,
      pagination: {},
    });
    abortCtrl.abort();

    if (data && data.length) return data[0];
    return null;
  } catch (error) {
    throw new Error(error);
  }
};
export const getListRules = async (listId: string) => {
  try {
    const abortCtrl = new AbortController();
    const { data: rules } = await fetchRules({
      signal: abortCtrl.signal,
    });
    abortCtrl.abort();
    return rules.reduce((acc: Rule[], rule, index) => {
      const listExceptions = rule.exceptions_list?.find(
        (exceptionList) => exceptionList.list_id === listId
      );
      if (listExceptions) acc.push(rule);
      return acc;
    }, []);
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
    abortCtrl.abort();
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
