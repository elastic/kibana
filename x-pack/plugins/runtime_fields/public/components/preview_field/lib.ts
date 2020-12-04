/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from 'src/plugins/data/public';
import { SearchResult } from './preview_field';

export const parseSearchResponse = (searchResponse: IEsSearchResponse): SearchResult => {
  const { rawResponse } = searchResponse;

  const fieldNames = rawResponse?.hits.hits.reduce((acc, hit) => {
    return new Set([...acc, ...Object.keys(hit.fields ?? {})]);
  }, new Set<string>());

  const documents = rawResponse?.hits.hits.map(({ _id, _index, fields }) => ({
    _id,
    _index,
    uuid: `${_index}__${_id}`, // Create unique id by concatening the index with the doc id
    fields,
  }));

  return {
    fieldNames: fieldNames ? Array.from(fieldNames) : [],
    documents: documents ? documents : [],
  };
};
