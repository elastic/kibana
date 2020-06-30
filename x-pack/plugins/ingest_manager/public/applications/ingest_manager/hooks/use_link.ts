/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BASE_PATH,
  StaticPage,
  DynamicPage,
  DynamicPagePathValues,
  pagePathGetters,
} from '../constants';
import { useCore } from './';

const getPath = (page: StaticPage | DynamicPage, values: DynamicPagePathValues = {}): string => {
  return values ? pagePathGetters[page](values) : pagePathGetters[page as StaticPage]();
};

export const useLink = () => {
  const core = useCore();
  return {
    getPath,
    getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => {
      const path = getPath(page, values);
      return core.http.basePath.prepend(`${BASE_PATH}#${path}`);
    },
  };
};
