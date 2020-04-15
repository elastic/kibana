/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const createMockIndexPatternRetriever = (indexPattern: string) => {
  const mockGetFunc = jest.fn().mockResolvedValue(indexPattern);
  return {
    getIndexPattern: mockGetFunc,
    getEventIndexPattern: mockGetFunc,
    getMetadataIndexPattern: mockGetFunc,
  };
};

export const MetadataIndexPattern = 'metrics-endpoint-*';

export const createMockMetadataIndexPatternRetriever = () => {
  return createMockIndexPatternRetriever(MetadataIndexPattern);
};

export const createMockIndexPatternService = (indexPattern: string) => {
  return {
    esIndexPatternService: {
      getESIndexPattern: jest.fn().mockResolvedValue(indexPattern),
    },
  };
};
