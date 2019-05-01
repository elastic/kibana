/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import hash from 'object-hash';
import { useUrlParams } from '../../hooks/useUrlParams';
import { UIFilters } from '../../../typings/ui-filters';
import { IUrlParams } from '../../context/UrlParamsContext/types';

function getUIFilters(urlParams: IUrlParams): UIFilters {
  return {
    kuery: urlParams.kuery,
    environment: urlParams.environment
  };
}

const UiFiltersContext = createContext({
  uiFilters: {} as UIFilters,
  uiFiltersKey: hash({})
});

const UiFiltersProvider: React.FC<{}> = ({ children }) => {
  const { urlParams } = useUrlParams();
  const uiFilters = getUIFilters(urlParams);
  return (
    <UiFiltersContext.Provider
      children={children}
      value={{ uiFilters, uiFiltersKey: hash(uiFilters) }}
    />
  );
};

export { UiFiltersContext, UiFiltersProvider };
