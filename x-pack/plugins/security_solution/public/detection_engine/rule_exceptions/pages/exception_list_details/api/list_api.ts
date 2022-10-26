/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteExceptionListById,
  exportExceptionList,
  updateExceptionList,
} from '@kbn/securitysolution-list-api';

import type { HttpSetup } from '@kbn/core-http-browser';
import type { DeleteExceptionList, ExportExceptionList, UpdateExceptionList } from './types';

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
