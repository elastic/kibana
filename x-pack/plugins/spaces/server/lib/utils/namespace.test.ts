/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { spaceIdToNamespace, namespaceToSpaceId } from './namespace';

describe('#spaceIdToNamespace', () => {
  it('converts the default space to undefined', () => {
    expect(spaceIdToNamespace(DEFAULT_SPACE_ID)).toBeUndefined();
  });

  it('returns non-default spaces as-is', () => {
    expect(spaceIdToNamespace('foo')).toEqual('foo');
  });

  it('throws an error when a spaceId is not provided', () => {
    // @ts-ignore ts knows this isn't right
    expect(() => spaceIdToNamespace()).toThrowErrorMatchingInlineSnapshot(`"spaceId is required"`);

    // @ts-ignore ts knows this isn't right
    expect(() => spaceIdToNamespace(null)).toThrowErrorMatchingInlineSnapshot(
      `"spaceId is required"`
    );

    expect(() => spaceIdToNamespace('')).toThrowErrorMatchingInlineSnapshot(
      `"spaceId is required"`
    );
  });
});

describe('#namespaceToSpaceId', () => {
  it('returns the default space id for undefined namespaces', () => {
    expect(namespaceToSpaceId(undefined)).toEqual(DEFAULT_SPACE_ID);
  });

  it('returns all other namespaces as-is', () => {
    expect(namespaceToSpaceId('foo')).toEqual('foo');
  });

  it('throws an error when an empty string is provided', () => {
    expect(() => namespaceToSpaceId('')).toThrowErrorMatchingInlineSnapshot(
      `"namespace cannot be an empty string"`
    );
  });
});
