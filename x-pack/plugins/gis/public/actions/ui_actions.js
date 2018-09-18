/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CHANGE_BANNER_VISIBLE = 'CHANGE_BANNER_VISIBLE';
export const CHANGE_NAV_EXPANDED = 'CHANGE_NAV_EXPANDED';

export function changeBannerVisible(boolVisible) {
  return {
    type: CHANGE_BANNER_VISIBLE,
    visible: boolVisible
  };
}

export function changeNavExpanded(boolExpanded) {
  return {
    type: CHANGE_NAV_EXPANDED,
    expanded: boolExpanded
  };
}
