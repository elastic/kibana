/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PLUGIN_ID } from '../../common/constants/plugin';
import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../constants/page_paths';
import { pagePathGetters } from '../constants/page_paths';

import { useStartServices } from './use_core';

const getSeparatePaths = (
  page: StaticPage | DynamicPage,
  values: DynamicPagePathValues = {}
): [string, string] => {
  return values ? pagePathGetters[page](values) : pagePathGetters[page as StaticPage]();
};

export const useLink = () => {
  const core = useStartServices();
  return {
    getPath: (page: StaticPage | DynamicPage, values: DynamicPagePathValues = {}): string => {
      return getSeparatePaths(page, values)[1];
    },
    getAssetsPath: (path: string) =>
      core.http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${path}`),
    getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => {
      const [basePath, path] = getSeparatePaths(page, values);
      return core.http.basePath.prepend(`${basePath}${path}`);
    },
  };
};
