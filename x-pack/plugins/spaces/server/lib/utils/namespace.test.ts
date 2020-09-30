/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockNamespaceIdToString, mockNamespaceStringToId } from './__mocks__';
import { spaceIdToNamespace, namespaceToSpaceId } from './namespace';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('#spaceIdToNamespace', () => {
  it('returns result of namespaceStringToId', () => {
    mockNamespaceStringToId.mockReturnValue('bar');

    const result = spaceIdToNamespace('foo');
    expect(mockNamespaceStringToId).toHaveBeenCalledWith('foo');
    expect(result).toEqual('bar');
  });
});

describe('#namespaceToSpaceId', () => {
  it('returns result of namespaceIdToString', () => {
    mockNamespaceIdToString.mockReturnValue('bar');

    const result = namespaceToSpaceId('foo');
    expect(mockNamespaceIdToString).toHaveBeenCalledWith('foo');
    expect(result).toEqual('bar');
  });
});
