/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IIndexPattern, IFieldType, IndexPatternsContract } from 'src/plugins/data/common';

const indexPatternFields: IFieldType[] = [
  {
    name: 'event.dataset',
    type: 'string',
    esTypes: ['keyword'],
    aggregatable: true,
    filterable: true,
    searchable: true,
  },
];

const indexPattern: IIndexPattern = {
  id: '1234',
  title: 'log-indices-*',
  timeFieldName: '@timestamp',
  fields: indexPatternFields,
};

export const getFrameworkMock = (): any => {
  return {
    getIndexPatternsService: async () => {
      return {
        get: async (id) => indexPattern,
        getFieldsForWildcard: async (options) => indexPatternFields,
      } as Pick<IndexPatternsContract, 'get' | 'getFieldsForWildcard'>;
    },
  };
};
