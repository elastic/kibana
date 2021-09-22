/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import React, { useEffect, useState, FormEvent } from 'react';
import { map } from 'lodash';
import { useUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../../hooks/use_fetcher';
import { I18LABELS } from '../../translations';
import { formatToSec } from '../../UXMetrics/KeyUXMetrics';
import { SelectableUrlList } from './SelectableUrlList';
import { UrlOption } from './RenderOption';
import { useUxQuery } from '../../hooks/useUxQuery';
import { getPercentileLabel } from '../../UXMetrics/translations';

interface Props {
  onChange: (value?: string[], excludedValue?: string[]) => void;
  updateSearchTerm: (value: string) => void;
}

interface URLItem {
  url: string;
  count: number;
  pld: number;
}

const formatOptions = (
  urlItems: URLItem[],
  includedUrls?: string[],
  excludedUrls?: string[],
  percentile?: number
): UrlOption[] => {
  const percTitle = getPercentileLabel(percentile!);

  return urlItems.map((item) => ({
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
    checked: includedUrls?.includes(item.url)
      ? 'on'
      : excludedUrls?.includes(item.url)
      ? 'off'
      : undefined,
  }));
};

export function URLSearch({
  onChange: onFilterChange,
  updateSearchTerm,
}: Props) {
  const { uxUiFilters, urlParams } = useUrlParams();

  const { transactionUrl, transactionUrlExcluded, ...restFilters } =
    uxUiFilters;

  const { searchTerm, percentile } = urlParams;

  const [popoverIsOpen, setPopoverIsOpen] = useState<boolean>(false);

  const [searchValue, setSearchValue] = useState(searchTerm ?? '');

  const [debouncedValue, setDebouncedValue] = useState(searchTerm ?? '');

  const [items, setItems] = useState<UrlOption[]>([]);

  useDebounce(
    () => {
      setSearchValue(debouncedValue);
    },
    250,
    [debouncedValue]
  );

  const uxQuery = useUxQuery();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery && popoverIsOpen) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/url-search',
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
    setItems(
      formatOptions(
        data?.items ?? [],
        transactionUrl,
        transactionUrlExcluded,
        percentile
      )
    );
  }, [data, percentile, transactionUrl, transactionUrlExcluded]);

  useEffect(() => {
    if (searchTerm && searchValue === '') {
      updateSearchTerm('');
    }
  }, [searchValue, updateSearchTerm, searchTerm]);

  const onChange = (updatedOptions: UrlOption[]) => {
    const includedItems = map(
      updatedOptions.filter((option) => option.checked === 'on'),
      'label'
    );

    const excludedItems = map(
      updatedOptions.filter((option) => option.checked === 'off'),
      'label'
    );

    setItems(
      formatOptions(data?.items ?? [], includedItems, excludedItems, percentile)
    );
  };

  const onInputChange = (e: FormEvent<HTMLInputElement>) => {
    setDebouncedValue(e.currentTarget.value);
  };

  const isLoading = status !== 'success';

  const onTermChange = () => {
    updateSearchTerm(searchValue);
  };

  const onApply = () => {
    const includedItems = map(
      items.filter((option) => option.checked === 'on'),
      'label'
    );

    const excludedItems = map(
      items.filter((option) => option.checked === 'off'),
      'label'
    );

    onFilterChange(includedItems, excludedItems);
  };

  return (
    <SelectableUrlList
      initialValue={searchTerm}
      loading={isLoading}
      onInputChange={onInputChange}
      onTermChange={onTermChange}
      data={{ items, total: data?.total ?? 0 }}
      onChange={onChange}
      searchValue={searchValue}
      popoverIsOpen={Boolean(popoverIsOpen)}
      setPopoverIsOpen={setPopoverIsOpen}
      onApply={onApply}
    />
  );
}
