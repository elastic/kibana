/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function indicesApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');
  const executeActionOnIndices = ({
    index,
    urlParam,
    args,
  }: {
    index?: string | string[];
    urlParam: string;
    args?: any;
  }) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest
      .post(`${API_BASE_PATH}/indices/${urlParam}`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices, ...args });
  };

  const closeIndex = (index: string) => executeActionOnIndices({ index, urlParam: 'close' });

  const openIndex = (index: string) => executeActionOnIndices({ index, urlParam: 'open' });

  const deleteIndex = (index?: string) => executeActionOnIndices({ index, urlParam: 'delete' });

  const flushIndex = (index: string) => executeActionOnIndices({ index, urlParam: 'flush' });

  const refreshIndex = (index: string) => executeActionOnIndices({ index, urlParam: 'refresh' });

  const forceMerge = (index: string, args?: { maxNumSegments: number }) =>
    executeActionOnIndices({ index, urlParam: 'forcemerge', args });

  const clearCache = (index: string) => executeActionOnIndices({ index, urlParam: 'clear_cache' });

  const list = () => supertest.get(`${API_BASE_PATH}/indices`);

  const reload = (indexNames?: string[]) =>
    supertest.post(`${API_BASE_PATH}/indices/reload`).set('kbn-xsrf', 'xxx').send({ indexNames });

  const create = (indexName?: string, indexMode?: string) =>
    supertest
      .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
      .set('kbn-xsrf', 'xxx')
      .send({ indexName, indexMode });

  return {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    list,
    reload,
    clearCache,
    create,
  };
}
