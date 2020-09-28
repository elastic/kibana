/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import React, { useEffect, useState, FormEvent, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { I18LABELS } from '../../translations';
import { fromQuery, toQuery } from '../../../../shared/Links/url_helpers';
import { formatToSec } from '../../UXMetrics/KeyUXMetrics';
import { SelectableUrlList } from './SelectableUrlList';
import { UrlOption } from './RenderOption';

interface Props {
  onChange: (value: string[]) => void;
}

export function URLSearch({ onChange: onFilterChange }: Props) {
  const history = useHistory();

  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const [searchValue, setSearchValue] = useState('');

  const [debouncedValue, setDebouncedValue] = useState('');

  useDebounce(
    () => {
      setSearchValue(debouncedValue);
    },
    250,
    [debouncedValue]
  );

  const updateSearchTerm = useCallback(
    (searchTermN: string) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          searchTerm: searchTermN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  const [checkedUrls, setCheckedUrls] = useState<string[]>([]);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        const { transactionUrl, ...restFilters } = uiFilters;

        return callApmApi({
          pathname: '/api/apm/rum-client/url-search',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(restFilters),
              urlQuery: searchValue,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, searchValue]
  );

  useEffect(() => {
    setCheckedUrls(uiFilters.transactionUrl || []);
  }, [uiFilters]);

  const onChange = (updatedOptions: UrlOption[]) => {
    const clickedItems = updatedOptions.filter(
      (option) => option.checked === 'on'
    );

    setCheckedUrls(clickedItems.map((item) => item.url));
  };

  const items: UrlOption[] = (data?.items ?? []).map((item) => ({
    label: item.url,
    key: item.url,
    meta: [
      I18LABELS.pageViews + ': ' + item.count,
      I18LABELS.pageLoadDuration + ': ' + formatToSec(item.pld),
    ],
    url: item.url,
    checked: checkedUrls?.includes(item.url) ? 'on' : undefined,
  }));

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    setDebouncedValue(e.currentTarget.value);
  };

  const isLoading = status !== 'success';

  const onTermChange = () => {
    updateSearchTerm(searchValue);
  };

  const onClose = () => {
    onFilterChange(checkedUrls);
  };

  return (
    <>
      <EuiTitle size="xxs" textTransform="uppercase">
        <h4>{I18LABELS.url}</h4>
      </EuiTitle>
      <SelectableUrlList
        loading={isLoading}
        onInputChange={onInputChange}
        onTermChange={onTermChange}
        data={{ items, total: data?.total ?? 0 }}
        onChange={onChange}
        onClose={onClose}
        searchValue={searchValue}
      />
    </>
  );
}
