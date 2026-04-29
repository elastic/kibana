/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from './random';

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const initElasticsearchIndicesHelpers = (getService) => {
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  let indicesCreated = [];

  const createIndex = (index = getRandomString(), body = {}) => {
    indicesCreated.push(index);
    return es.indices
      .create({
        index,
        body,
      })
      .then(() => index);
  };

  const deleteIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];
    indicesCreated = indicesCreated.filter((i) => !indices.includes(i));
    return esDeleteAllIndices(indices);
  };

  const deleteAllIndicesCreated = () =>
    deleteIndex(indicesCreated).then(() => (indicesCreated = []));

  return {
    createIndex,
    deleteIndex,
    deleteAllIndicesCreated,
  };
};
