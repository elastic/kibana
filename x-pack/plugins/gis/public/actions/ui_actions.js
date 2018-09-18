/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CHANGE_BANNER_SIZE = 'CHANGE_BANNER_SIZE';
export const CHANGE_NAV_SIZE = 'CHANGE_NAV_SIZE';

export function changeBannerSize() {
  console.log(CHANGE_BANNER_SIZE);
  return {
    type: CHANGE_BANNER_SIZE
  };
}

export function changeNavSize() {
  console.log(CHANGE_NAV_SIZE);
  return {
    type: CHANGE_NAV_SIZE
  };
}
