/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENTERPRISE_SEARCH_KIBANA_COOKIE } from '../../common/constants';

import { getOAuthTokenPackageParams } from './get_oauth_token_package_params';

describe('getOAuthTokenPackage', () => {
  const tokenPackage = 'some_encrypted_secrets';
  const tokenPackageCookie = `${ENTERPRISE_SEARCH_KIBANA_COOKIE}=${tokenPackage}`;
  const tokenPackageParams = { token_package: tokenPackage };

  describe('when there are no cookie headers', () => {
    it('returns an empty parameter set', () => {
      expect(getOAuthTokenPackageParams(undefined)).toEqual({});
    });
  });

  describe('when there is a single cookie header', () => {
    it('returns an empty parameter set when our cookie is not there', () => {
      const cookieHeader = '_st_fruit=banana';

      expect(getOAuthTokenPackageParams(cookieHeader)).toEqual({});
    });

    it('returns the token package when our cookie is the only one', () => {
      const cookieHeader = `${tokenPackageCookie}`;

      expect(getOAuthTokenPackageParams(cookieHeader)).toEqual(tokenPackageParams);
    });

    it('returns the token package when there are other cookies in the header', () => {
      const cookieHeader = `_chocolate=chip; ${tokenPackageCookie}; _oatmeal=raisin`;

      expect(getOAuthTokenPackageParams(cookieHeader)).toEqual(tokenPackageParams);
    });
  });

  describe('when there are multiple cookie headers', () => {
    it('returns an empty parameter set when none of them include our cookie', () => {
      const cookieHeaders = ['_st_fruit=banana', '_sid=12345'];

      expect(getOAuthTokenPackageParams(cookieHeaders)).toEqual({});
    });

    it('returns the token package when our cookie is present', () => {
      const cookieHeaders = ['_st_fruit=banana', `_heat=spicy; ${tokenPackageCookie}`];

      expect(getOAuthTokenPackageParams(cookieHeaders)).toEqual(tokenPackageParams);
    });
  });
});
