/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';

interface Location {
  pathname: string;
  search: string;
}

export const useUrlParams = (history: any, location: Location) => {
  const { pathname, search } = location;
  const currentParams = qs.parse(search);

  const updateUrl = (updatedParams: any) => {
    const updatedSearch = qs.stringify({ ...currentParams, ...updatedParams });

    history.push({
      pathname,
      search: updatedSearch,
    });

    return pathname + search;
  };

  return [currentParams, updateUrl];
};
