/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { createContext, Dispatch } from 'react';

import { SecurityPageName } from '../../../app/types';
import { RouteSpyState, RouteSpyAction } from './types';

export const initRouteSpy: RouteSpyState = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
  state: undefined,
};

export const RouterSpyStateContext = createContext<[RouteSpyState, Dispatch<RouteSpyAction>]>([
  initRouteSpy,
  () => noop,
]);

/**
 * Returns the CSS `top` property, in pixels for the main pageContainer
 */
export const getPageContainerTop = ({
  globalFullScreen,
  hasCompactHeader,
}: {
  globalFullScreen: boolean;
  hasCompactHeader: boolean;
}) => {
  if (globalFullScreen) {
    return FULL_SCREEN_MAIN_PAGE_CONTAINER_TOP;
  }

  return hasCompactHeader
    ? COMPACT_HEADER_MAIN_PAGE_CONTAINER_TOP
    : DEFAULT_MAIN_PAGE_CONTAINER_TOP;
};

/** Returns true if the specified page has a compact header */
export const hasCompactHeader = (pageName: SecurityPageName): boolean => {
  switch (pageName) {
    case SecurityPageName.timelines: // fall through
    case SecurityPageName.case: // fall through
    case SecurityPageName.administration: // fall through
      return true;
    default:
      return false;
  }
};

/**
 * The Main `pageContainer`'s `top` CSS property for pages with a "regular"
 * (non-compact) header (in pixels)
 */
export const DEFAULT_MAIN_PAGE_CONTAINER_TOP = 181; // px

/**
 * The Main `pageContainer`'s `top` CSS property for pages with a compact
 * header (in pixels)
 */
export const COMPACT_HEADER_MAIN_PAGE_CONTAINER_TOP = 73; // px

/**
 * The Main `pageContainer`'s `top` CSS property for in full screen mode
 */
export const FULL_SCREEN_MAIN_PAGE_CONTAINER_TOP = 116; // px
