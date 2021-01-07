/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const mockNamespaceIdToString = jest.fn();
const mockNamespaceStringToId = jest.fn();
jest.mock('../../../../../../../src/core/server', () => ({
  SavedObjectsUtils: {
    namespaceIdToString: mockNamespaceIdToString,
    namespaceStringToId: mockNamespaceStringToId,
  },
}));

export { mockNamespaceIdToString, mockNamespaceStringToId };
