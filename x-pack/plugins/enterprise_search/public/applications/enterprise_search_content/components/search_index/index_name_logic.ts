/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

export interface IndexNameProps {
  indexName: string;
}

export type IndexNameValues = IndexNameProps;

export interface IndexNameActions {
  setIndexName: (indexName: string) => { indexName: string };
}

export const IndexNameLogic = kea<MakeLogicType<IndexNameValues, IndexNameActions>>({
  actions: {
    setIndexName: (indexName) => ({ indexName }),
  },
  path: ['enterprise_search', 'content', 'index_name'],
  reducers: () => ({
    indexName: [
      // Short-circuiting this to empty string is necessary to enable testing logics relying on this
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setIndexName: (_, { indexName }) => indexName,
      },
    ],
  }),
});
