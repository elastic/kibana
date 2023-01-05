/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockSpaceIdToNamespace } from './saved_objects_spaces_extension.test.mocks';

import Boom from '@hapi/boom';

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
      'Namespace cannot be specified by the caller when the spaces extension is enabled. Spaces currently determines the namespace.'
    );
  });

  test('returns namespace for the active space ID when the namespace parameter is falsy', () => {
    const { spacesExtension } = setup();
    const result = spacesExtension.getCurrentNamespace(undefined);
    expect(result).toEqual('namespace-for-active-spaceId');
  });
});

describe('#getSearchableNamespaces', () => {
  test(`returns empty result if user is unauthorized in this space`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
        { id: 'ns-3', name: '', disabledFeatures: [] },
        { id: 'ns-4', name: '', disabledFeatures: [] },
      ])
    );
    await expect(spacesExtension.getSearchableNamespaces(['some-namespace'])).resolves.toEqual([]);
  });

  test(`throws an error if user is unauthorized in any space`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockRejectedValue(Boom.forbidden());
    await expect(spacesExtension.getSearchableNamespaces(['some-namespace'])).rejects.toThrow(
      'Forbidden'
    );
  });

  test(`returns the active namespace if the namespaces argument is undefined`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
        { id: 'ns-3', name: '', disabledFeatures: [] },
        { id: 'ns-4', name: '', disabledFeatures: [] },
      ])
    );
    await expect(spacesExtension.getSearchableNamespaces(undefined)).resolves.toEqual([
      ACTIVE_SPACE_ID,
    ]);
  });

  test(`returns an empty array if the namespaces argument is an empty array`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
        { id: 'ns-3', name: '', disabledFeatures: [] },
        { id: 'ns-4', name: '', disabledFeatures: [] },
      ])
    );
    await expect(spacesExtension.getSearchableNamespaces([])).resolves.toEqual([]);
  });

  test(`filters results based on requested namespaces`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
        { id: 'ns-3', name: '', disabledFeatures: [] },
        { id: 'ns-4', name: '', disabledFeatures: [] },
      ])
    );

    await expect(spacesExtension.getSearchableNamespaces(['ns-1', 'ns-3'])).resolves.toEqual([
      'ns-1',
      'ns-3',
    ]);
  });

  test(`filters options.namespaces based on authorization`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
      ])
    );

    await expect(spacesExtension.getSearchableNamespaces(['ns-1', 'ns-3'])).resolves.toEqual([
      'ns-1',
    ]);
  });

  test(`handles namespaces argument ['*']`, async () => {
    const { spacesClient, spacesExtension } = setup();
    spacesClient.getAll.mockImplementation(() =>
      Promise.resolve([
        { id: 'ns-1', name: '', disabledFeatures: [] },
        { id: 'ns-2', name: '', disabledFeatures: [] },
        { id: 'ns-3', name: '', disabledFeatures: [] },
        { id: 'ns-4', name: '', disabledFeatures: [] },
      ])
    );

    await expect(spacesExtension.getSearchableNamespaces(['*'])).resolves.toEqual([
      'ns-1',
      'ns-2',
      'ns-3',
      'ns-4',
    ]);
  });
});
