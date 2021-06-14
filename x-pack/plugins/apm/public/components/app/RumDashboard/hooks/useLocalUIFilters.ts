/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import {
  filtersByName,
  LocalUIFilterName,
} from '../../../../../common/ui_filter';
import {
  fromQuery,
  toQuery,
} from '../../../../components/shared/Links/url_helpers';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';

export type FiltersUIHook = ReturnType<typeof useLocalUIFilters>;

export function useLocalUIFilters({
  filterNames,
}: {
  filterNames: LocalUIFilterName[];
}) {
  const history = useHistory();
  const { uiFilters } = useUrlParams();

  const setFilterValue = (name: LocalUIFilterName, value: string[]) => {
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

  const clearValues = () => {
    const search = omit(toQuery(history.location.search), [
      ...filterNames,
      'transactionUrl',
    ]);

    history.push({
      ...history.location,
      search: fromQuery(search),
    });
  };

  const filters = filterNames.map((name) => ({
    value: (uiFilters[name] as string[]) ?? [],
    ...filtersByName[name],
    name,
  }));

  return {
    filters,
    setFilterValue,
    clearValues,
  };
}
