/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityPageName } from '../../../app/types';
import {
  COMPACT_HEADER_MAIN_PAGE_CONTAINER_TOP,
  DEFAULT_MAIN_PAGE_CONTAINER_TOP,
  FULL_SCREEN_MAIN_PAGE_CONTAINER_TOP,
  getPageContainerTop,
  hasCompactHeader,
} from './helpers';

describe('route helpers', () => {
  describe('getPageContainerTop', () => {
    test('it returns the default `top` CSS property for pages with a regular, non-compact header when globalFullScreen is false', () => {
      expect(getPageContainerTop({ globalFullScreen: false, hasCompactHeader: false })).toEqual(
        DEFAULT_MAIN_PAGE_CONTAINER_TOP
      );
    });

    test('it returns the full screen `top` CSS property for pages with a regular, non-compact header when globalFullScreen is true', () => {
      expect(getPageContainerTop({ globalFullScreen: true, hasCompactHeader: false })).toEqual(
        FULL_SCREEN_MAIN_PAGE_CONTAINER_TOP
      );
    });

    test('it returns the compact `top` CSS property for pages with a compact header when globalFullScreen is false', () => {
      expect(getPageContainerTop({ globalFullScreen: false, hasCompactHeader: true })).toEqual(
        COMPACT_HEADER_MAIN_PAGE_CONTAINER_TOP
      );
    });

    test('it returns the full screen `top` CSS property for pages with a compact header when globalFullScreen is true', () => {
      expect(getPageContainerTop({ globalFullScreen: true, hasCompactHeader: true })).toEqual(
        FULL_SCREEN_MAIN_PAGE_CONTAINER_TOP
      );
    });
  });

  describe('hasCompactHeader', () => {
    const compactHeaderPages = [
      SecurityPageName.timelines,
      SecurityPageName.case,
      SecurityPageName.administration,
    ];

    Object.keys(SecurityPageName).forEach((page) => {
      const pageName = page as SecurityPageName;
      const expectedReturn = compactHeaderPages.includes(pageName);

      test(`it returns ${expectedReturn} when pageName is ${pageName}`, () => {
        expect(hasCompactHeader(pageName)).toBe(expectedReturn);
      });
    });
  });
});
