/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { createGetNamespace } from './get_namespace';
import {
  SavedObjectsNamespace,
  SavedObjectsService,
  SavedObjectsBaseOptions,
} from 'src/core/server';

describe('getNamespace', () => {
  let getNamespace: (
    options: SavedObjectsBaseOptions,
    spaceId: string
  ) => SavedObjectsNamespace | undefined;

  beforeEach(() => {
    const savedObjectsService = {
      createNamespace: (id?: string) => ({ id } as SavedObjectsNamespace),
    } as SavedObjectsService;

    getNamespace = createGetNamespace(savedObjectsService);
  });

  describe(`without specifying 'options.namespace'`, () => {
    it(`returns an empty namespace for the default space`, () => {
      expect(getNamespace({}, DEFAULT_SPACE_ID)).toEqual({});
    });

    it(`returns the space id for non-default spaces`, () => {
      expect(getNamespace({}, 'some-space')).toEqual({ id: 'some-space' });
    });
  });

  describe(`when specifying 'options.namespace' with an undefined id`, () => {
    it(`returns the empty namespace for the default space`, () => {
      expect(getNamespace({ namespace: {} }, DEFAULT_SPACE_ID)).toEqual({});
    });

    it(`returns the empty namespace for non-default spaces`, () => {
      expect(getNamespace({ namespace: {} }, 'some-space')).toEqual({});
    });
  });

  describe(`when specifying 'options.namespace'`, () => {
    it(`returns 'undefined' when specified via options.namespace`, () => {
      expect(getNamespace({ namespace: { id: 'override-space' } }, DEFAULT_SPACE_ID)).toEqual({
        id: 'override-space',
      });
    });

    it(`returns the namespace from options`, () => {
      expect(getNamespace({ namespace: { id: 'override-space' } }, 'some-space')).toEqual({
        id: 'override-space',
      });
    });
  });
});
