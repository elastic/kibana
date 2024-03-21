/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';
import { fromQuery, toQuery } from '@kbn/observability-plugin/public';
import { URLSearch } from './url_search';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';

export function URLFilter() {
  const history = useHistory();

  const setFilterValue = useCallback(
    (value?: string[], excludedValue?: string[]) => {
      const name = 'transactionUrl';
      const nameExcluded = 'transactionUrlExcluded';

      const search = omit(toQuery(history.location.search), name);

      history.push({
        ...history.location,
        search: fromQuery(
          removeUndefinedProps({
            ...search,
            [name]: value?.length ? value.join(',') : undefined,
            [nameExcluded]: excludedValue?.length
              ? excludedValue.join(',')
              : undefined,
          })
        ),
      });
    },
    [history]
  );

  const updateSearchTerm = useCallback(
    (searchTermN: string) => {
      const newQuery = {
        ...toQuery(history.location.search),
        searchTerm: searchTermN || undefined,
      };
      if (!searchTermN) {
        delete newQuery.searchTerm;
      }
      const newLocation = {
        ...history.location,
        search: fromQuery(newQuery),
      };
      history.push(newLocation);
    },
    [history]
  );

  return (
    <span data-cy="csmUrlFilter">
      <URLSearch
        onChange={setFilterValue}
        updateSearchTerm={updateSearchTerm}
      />
    </span>
  );
}
