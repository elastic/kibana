/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import { useState } from 'react';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import { useUxQuery } from '../../hooks/use_ux_query';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';

interface Props {
  popoverIsOpen: boolean;
  query: string;
}

export const useUrlSearch = ({ popoverIsOpen, query }: Props) => {
  const uxQuery = useUxQuery();

  const { uxUiFilters } = useLegacyUrlParams();

  const { transactionUrl, transactionUrlExcluded, ...restFilters } =
    uxUiFilters;

  const [searchValue, setSearchValue] = useState(query ?? '');

  useDebounce(
    () => {
      setSearchValue(query);
    },
    250,
    [query]
  );

  return useFetcher(
    (callApmApi) => {
      if (uxQuery && popoverIsOpen) {
        return callApmApi('GET /internal/apm/ux/url-search', {
          params: {
            query: {
              ...uxQuery,
              uiFilters: JSON.stringify(restFilters),
              urlQuery: searchValue,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uxQuery, searchValue, popoverIsOpen]
  );
};
