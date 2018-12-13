/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BASE_PATH } from '../../common/constants';
let urlService;
export const setUrlService = (aUrlService) => {
  urlService = aUrlService;
};
export const getUrlService = () => {
  return urlService;
};
export const getFilteredIndicesUri = (filter) => {
  return encodeURI(`#${BASE_PATH}indices/filter/${encodeURIComponent(filter)}`);
};