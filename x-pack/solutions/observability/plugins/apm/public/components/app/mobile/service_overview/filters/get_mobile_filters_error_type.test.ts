/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MobileErrorType } from '../../../../../../common/mobile_types';
import { getMobileFiltersErrorType } from '.';

const base = {
  isCrashDetail: false,
  isErrorDetail: false,
  isErrorsAndCrashes: false,
  mobileErrorTabId: undefined,
};

describe('getMobileFiltersErrorType', () => {
  it('is undefined on the overview and transactions screens', () => {
    expect(getMobileFiltersErrorType(base)).toBeUndefined();
  });

  describe('on the errors-and-crashes list', () => {
    it('scopes to crashes on the crashes tab', () => {
      expect(
        getMobileFiltersErrorType({
          ...base,
          isErrorsAndCrashes: true,
          mobileErrorTabId: 'crashes',
        })
      ).toBe(MobileErrorType.Crash);
    });

    it('scopes to errors on the errors tab', () => {
      expect(
        getMobileFiltersErrorType({
          ...base,
          isErrorsAndCrashes: true,
          mobileErrorTabId: 'errors',
        })
      ).toBe(MobileErrorType.Error);
    });

    it('scopes to errors when no tab is in the url, since errors is the default', () => {
      expect(getMobileFiltersErrorType({ ...base, isErrorsAndCrashes: true })).toBe(
        MobileErrorType.Error
      );
    });
  });

  describe('on the detail routes', () => {
    // The detail routes are nested under errors-and-crashes, so `isErrorsAndCrashes` is
    // true there as well. The route has to win, otherwise a crash detail page reached
    // without the tab param would list filter options that exclude its own crash.
    it('scopes to crashes on a crash detail page with no tab in the url', () => {
      expect(
        getMobileFiltersErrorType({ ...base, isErrorsAndCrashes: true, isCrashDetail: true })
      ).toBe(MobileErrorType.Crash);
    });

    it('scopes to errors on an error detail page with no tab in the url', () => {
      expect(
        getMobileFiltersErrorType({ ...base, isErrorsAndCrashes: true, isErrorDetail: true })
      ).toBe(MobileErrorType.Error);
    });

    it('ignores a stale tab id carried over into a crash detail page', () => {
      expect(
        getMobileFiltersErrorType({
          ...base,
          isErrorsAndCrashes: true,
          isCrashDetail: true,
          mobileErrorTabId: 'errors',
        })
      ).toBe(MobileErrorType.Crash);
    });
  });
});
