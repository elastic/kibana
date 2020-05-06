/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../../../common/model';
import { isUserReserved, isUserDeprecated, getExtendedUserDeprecationNotice } from './user_utils';

describe('#isUserReserved', () => {
  it('returns false for a user with no metadata', () => {
    expect(isUserReserved({} as User)).toEqual(false);
  });

  it('returns false for a user with the reserved flag set to false', () => {
    expect(isUserReserved({ metadata: { _reserved: false } } as User)).toEqual(false);
  });

  it('returns true for a user with the reserved flag set to true', () => {
    expect(isUserReserved({ metadata: { _reserved: true } } as User)).toEqual(true);
  });
});

describe('#isUserDeprecated', () => {
  it('returns false for a user with no metadata', () => {
    expect(isUserDeprecated({} as User)).toEqual(false);
  });

  it('returns false for a user with the deprecated flag set to false', () => {
    expect(isUserDeprecated({ metadata: { _deprecated: false } } as User)).toEqual(false);
  });

  it('returns true for a user with the deprecated flag set to true', () => {
    expect(isUserDeprecated({ metadata: { _deprecated: true } } as User)).toEqual(true);
  });
});

describe('#getExtendedUserDeprecationNotice', () => {
  it('returns a notice when no reason is provided', () => {
    expect(
      getExtendedUserDeprecationNotice({ username: 'test_user' } as User)
    ).toMatchInlineSnapshot(`"The test_user user is deprecated. "`);
  });

  it('returns a notice augmented with reason when provided', () => {
    expect(
      getExtendedUserDeprecationNotice({
        username: 'test_user',
        metadata: { _reserved: true, _deprecated_reason: 'some reason' },
      } as User)
    ).toMatchInlineSnapshot(`"The test_user user is deprecated. some reason"`);
  });
});
