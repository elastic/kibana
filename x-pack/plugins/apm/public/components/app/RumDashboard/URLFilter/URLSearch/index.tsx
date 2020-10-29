/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import useDebounce from 'react-use/lib/useDebounce';
import React, { useEffect, useState, FormEvent, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { I18LABELS } from '../../translations';
import { fromQuery, toQuery } from '../../../../shared/Links/url_helpers';
import { formatToSec } from '../../UXMetrics/KeyUXMetrics';
import { SelectableUrlList } from './SelectableUrlList';
import { UrlOption } from './RenderOption';
import { useUxQuery } from '../../hooks/useUxQuery';
import { getPercentileLabel } from '../../UXMetrics/translations';

interface Props {
  onChange: (value: string[]) => void;
}

export function URLSearch({ onChange: onFilterChange }: Props) {
  const history = useHistory();

  const { uiFilters, urlParams } = useUrlParams();

  const { searchTerm, percentile } = urlParams;

  const [popoverIsOpen, setPopoverIsOpen] = useState(false);

  const [searchValue, setSearchValue] = useState(searchTerm ?? '');

  const [debouncedValue, setDebouncedValue] = useState(searchTerm ?? '');

  useDebounce(
    () => {
      setSearchValue(debouncedValue);
    },
    250,
    [debouncedValue]
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

  const [checkedUrls, setCheckedUrls] = useState<string[]>([]);

  const uxQuery = useUxQuery();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery && popoverIsOpen) {
        const { transactionUrl, ...restFilters } = uiFilters;

        return callApmApi({
          pathname: '/api/apm/rum-client/url-search',
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

  useEffect(() => {
    setCheckedUrls(uiFilters.transactionUrl || []);
  }, [uiFilters]);

  useEffect(() => {
    if (searchTerm && searchValue === '') {
      updateSearchTerm('');
    }
  }, [searchValue, updateSearchTerm, searchTerm]);

  const onChange = (updatedOptions: UrlOption[]) => {
    const clickedItems = updatedOptions.filter(
      (option) => option.checked === 'on'
    );

    setCheckedUrls(clickedItems.map((item) => item.url));
  };

  const percTitle = getPercentileLabel(percentile!);

  const items: UrlOption[] = (data?.items ?? []).map((item) => ({
    label: item.url,
    key: item.url,
    meta: [
      I18LABELS.pageViews + ': ' + item.count,
      I18LABELS.pageLoadDuration +
        ': ' +
        formatToSec(item.pld) +
        ` (${percTitle})`,
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
    if (uiFilters.transactionUrl || checkedUrls.length > 0) {
      onFilterChange(checkedUrls);
    }
  };

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>{I18LABELS.url}</h4>
      </EuiTitle>
      <SelectableUrlList
        initialValue={searchTerm}
        loading={isLoading}
        onInputChange={onInputChange}
        onTermChange={onTermChange}
        data={{ items, total: data?.total ?? 0 }}
        onChange={onChange}
        onClose={onClose}
        searchValue={searchValue}
        popoverIsOpen={popoverIsOpen}
        setPopoverIsOpen={setPopoverIsOpen}
      />
    </>
  );
}
