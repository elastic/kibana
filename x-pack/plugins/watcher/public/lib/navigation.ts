/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let urlService: any;
import { BASE_PATH } from '../constants';
export const setUrlService = (aUrlService: any) => {
  urlService = aUrlService;
};
export const getUrlService = () => {
  return urlService;
};

export const goToWatchList = (shouldRedirect: boolean) => {
  const path = `${BASE_PATH}watches`;
  history.
    if(shouldRedirect) {
    urlService.redirect(path);
  } else {
    urlService.change(path);
  }
};
