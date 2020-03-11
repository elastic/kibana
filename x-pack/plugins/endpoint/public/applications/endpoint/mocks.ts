/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  dataPluginMock,
  Start as DataPublicStartMock,
} from '../../../../../../src/plugins/data/public/mocks';

type DataMock = Omit<DataPublicStartMock, 'indexPatterns' | 'query'> & {
  indexPatterns: Omit<DataPublicStartMock['indexPatterns'], 'getFieldsForWildcard'> & {
    getFieldsForWildcard: jest.Mock;
  };
  query: DataPublicStartMock['query'] & {
    filterManager: {
      setFilters: jest.Mock;
    };
  };
};

export interface DepsStartMock {
  data: DataMock;
}

export const depsStartMock: () => DepsStartMock = () => {
  const dataMock: DataMock = (dataPluginMock.createStartContract() as unknown) as DataMock;
  dataMock.indexPatterns.getFieldsForWildcard = jest.fn();
  dataMock.query.filterManager.setFilters = jest.fn();

  return {
    data: dataMock,
  };
};
