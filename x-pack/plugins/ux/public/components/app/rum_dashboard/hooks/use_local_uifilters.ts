/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { getExcludedName } from '../local_uifilters';

import { fromQuery, toQuery } from '../../../../../../observability/public';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import {
  uxFiltersByName,
  UxLocalUIFilter,
  UxLocalUIFilterName,
} from '../../../../../common/ux_ui_filter';

export type FiltersUIHook = ReturnType<typeof useLocalUIFilters>;

export function useLocalUIFilters({
  filterNames,
}: {
  filterNames: UxLocalUIFilterName[];
}) {
  const history = useHistory();
  const { uxUiFilters } = useLegacyUrlParams();

  const setFilterValue = (name: UxLocalUIFilterName, value: string[]) => {
    const search = omit(toQuery(history.location.search), name);

    history.push({
      ...history.location,
      search: fromQuery(
        removeUndefinedProps({
          ...search,
          [name]: value.length ? value.join(',') : undefined,
        })
      ),
    });
  };

  const invertFilter = (
    name: UxLocalUIFilterName,
    value: string,
    negate: boolean
  ) => {
    if (!negate) {
      setFilterValue(
        name,
        (uxUiFilters?.[name] as string[]).filter((valT) => valT !== value)
      );

      const excludedName = getExcludedName(name);
      setFilterValue(excludedName, [
        ...(uxUiFilters?.[excludedName] ?? []),
        value,
      ]);
    } else {
      const includeName = name.split('Excluded')[0] as UxLocalUIFilterName;
      const excludedName = name;

      setFilterValue(
        excludedName,
        (uxUiFilters?.[excludedName] as string[]).filter(
          (valT) => valT !== value
        )
      );

      setFilterValue(includeName, [
        ...(uxUiFilters?.[includeName] ?? []),
        value,
      ]);
    }
  };

  const clearValues = () => {
    const search = omit(toQuery(history.location.search), [
      ...filterNames,
      'searchTerm',
      'transactionUrl',
    ]);

    history.push({
      ...history.location,
      search: fromQuery(search),
    });
  };

  const filters: UxLocalUIFilter[] = filterNames.map((name) => ({
    value: (uxUiFilters[name] as string[]) ?? [],
    ...uxFiltersByName[name],
    name,
  }));

  return {
    filters,
    setFilterValue,
    clearValues,
    invertFilter,
  };
}
