/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { Projection } from '../../common/projections';
import { pickKeys } from '../../common/utils/pick_keys';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { LocalUIFiltersAPIResponse } from '../../server/lib/ui_filters/local_ui_filters';
import {
  LocalUIFilterName,
  localUIFilters,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/ui_filters/local_ui_filters/config';
import { fromQuery, toQuery } from '../components/shared/Links/url_helpers';
import { removeUndefinedProps } from '../context/UrlParamsContext/helpers';
import { useCallApi } from './useCallApi';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

const getInitialData = (
  filterNames: LocalUIFilterName[]
): LocalUIFiltersAPIResponse => {
  return filterNames.map((filterName) => ({
    options: [],
    ...localUIFilters[filterName],
  }));
};

export function useLocalUIFilters({
  projection,
  filterNames,
  params,
}: {
  projection: Projection;
  filterNames: LocalUIFilterName[];
  params?: Record<string, string | number | boolean | undefined>;
}) {
  const history = useHistory();
  const { uiFilters, urlParams } = useUrlParams();
  const callApi = useCallApi();

  const values = pickKeys(uiFilters, ...filterNames);

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
    const search = omit(toQuery(history.location.search), filterNames);
    history.push({
      ...history.location,
      search: fromQuery(search),
    });
  };

  const { data = getInitialData(filterNames), status } = useFetcher(() => {
    return callApi<LocalUIFiltersAPIResponse>({
      method: 'GET',
      pathname: `/api/apm/ui_filters/local_filters/${projection}`,
      query: {
        uiFilters: JSON.stringify(uiFilters),
        start: urlParams.start,
        end: urlParams.end,
        filterNames: JSON.stringify(filterNames),
        ...params,
      },
    });
  }, [
    callApi,
    projection,
    uiFilters,
    urlParams.start,
    urlParams.end,
    filterNames,
    params,
  ]);

  const filters = data.map((filter) => ({
    ...filter,
    value: values[filter.name] || [],
  }));

  return {
    filters,
    status,
    setFilterValue,
    clearValues,
  };
}
