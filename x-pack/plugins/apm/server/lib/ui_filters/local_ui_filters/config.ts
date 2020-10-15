/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filtersByName, LocalUIFilterName } from '../../../../common/ui_filter';

export interface LocalUIFilter {
  name: LocalUIFilterName;
  title: string;
  fieldName: string;
}

type LocalUIFilterMap = {
  [key in LocalUIFilterName]: LocalUIFilter;
};

export const localUIFilterNames = Object.keys(
  filtersByName
) as LocalUIFilterName[];

export const localUIFilters = localUIFilterNames.reduce((acc, key) => {
  const field = filtersByName[key];

  return {
    ...acc,
    [key]: {
      ...field,
      name: key,
    },
  };
}, {} as LocalUIFilterMap);
