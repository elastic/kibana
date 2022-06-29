/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockSpaceIdToNamespace } from './saved_objects_spaces_extension.test.mocks';

import { spacesClientMock } from '../mocks';
import { SavedObjectsSpacesExtension } from './saved_objects_spaces_extension';

const ACTIVE_SPACE_ID = 'active-spaceId';
function setup() {
  const spacesClient = spacesClientMock.create();
  const spacesExtension = new SavedObjectsSpacesExtension({
    activeSpaceId: ACTIVE_SPACE_ID,
    spacesClient,
  });
  return { spacesClient, spacesExtension };
}

beforeAll(() => {
  mockSpaceIdToNamespace.mockImplementation((spaceId) => `namespace-for-${spaceId}`);
});

describe('#getCurrentNamespace', () => {
  test('throws an error when the namespace parameter is truthy', () => {
    const { spacesExtension } = setup();
    expect(() => spacesExtension.getCurrentNamespace('some-namespace')).toThrowError(
      'Spaces currently determines the namespaces'
    );
  });

  test('returns namespace for the active space ID when the namespace parameter is falsy', () => {
    const { spacesExtension } = setup();
    const result = spacesExtension.getCurrentNamespace(undefined);
    expect(result).toEqual('namespace-for-active-spaceId');
  });
});

test.todo('#getSearchableNamespaces');
