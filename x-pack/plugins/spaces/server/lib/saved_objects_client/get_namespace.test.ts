/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getNamespace } from './get_namespace';

describe('getNamespace', () => {
  describe(`without specifying 'options.namespace'`, () => {
    it(`returns 'undefined' for the default space`, () => {
      expect(getNamespace({}, DEFAULT_SPACE_ID)).toBeUndefined();
    });

    it(`returns the space id for non-default spaces`, () => {
      expect(getNamespace({}, 'some-space')).toEqual('some-space');
    });
  });

  describe(`when specifying 'options.namespace'`, () => {
    it(`returns 'undefined' when specified via options.namespace`, () => {
      expect(getNamespace({ namespace: undefined }, 'some-space')).toBeUndefined();
    });

    it(`returns the namespace from options`, () => {
      expect(getNamespace({ namespace: 'override-space' }, 'some-space')).toEqual('override-space');
    });
  });
});
