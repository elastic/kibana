/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isEqual, map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { I18LABELS } from '../../translations';
import { formatToSec } from '../../ux_metrics/key_ux_metrics';
import { getPercentileLabel } from '../../ux_metrics/translations';
import { SelectableUrlList } from '../../../../../../../observability/public';
import { selectableRenderOptions, UrlOption } from './render_option';
import { useUrlSearch } from './use_url_search';

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
    title: item.url,
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

const processItems = (items: UrlOption[]) => {
  const includedItems = map(
    items.filter(({ checked, isWildcard }) => checked === 'on' && !isWildcard),
    'label'
  );

  const excludedItems = map(
    items.filter(({ checked, isWildcard }) => checked === 'off' && !isWildcard),
    'label'
  );

  const includedWildcards = map(
    items.filter(({ checked, isWildcard }) => checked === 'on' && isWildcard),
    'title'
  );

  const excludedWildcards = map(
    items.filter(({ checked, isWildcard }) => checked === 'off' && isWildcard),
    'title'
  );

  return { includedItems, excludedItems, includedWildcards, excludedWildcards };
};

const getWildcardLabel = (wildcard: string) => {
  return i18n.translate('xpack.ux.urlFilter.wildcard', {
    defaultMessage: 'Use wildcard *{wildcard}*',
    values: { wildcard },
  });
};

export function URLSearch({
  onChange: onFilterChange,
  updateSearchTerm,
}: Props) {
  const {
    uxUiFilters: { transactionUrl, transactionUrlExcluded },
    urlParams,
  } = useLegacyUrlParams();

  const { searchTerm, percentile } = urlParams;

  const [popoverIsOpen, setPopoverIsOpen] = useState<boolean>(false);

  const [searchValue, setSearchValue] = useState('');

  const [items, setItems] = useState<UrlOption[]>([]);

  const { data, status } = useUrlSearch({ query: searchValue, popoverIsOpen });

  useEffect(() => {
    const newItems = formatOptions(
      data?.items ?? [],
      transactionUrl,
      transactionUrlExcluded,
      percentile
    );
    const wildCardLabel = searchValue || searchTerm;

    if (wildCardLabel) {
      newItems.unshift({
        label: getWildcardLabel(wildCardLabel),
        title: wildCardLabel,
        isWildcard: true,
        checked: searchTerm ? 'on' : undefined,
      });
    }
    setItems(newItems);
  }, [
    data,
    percentile,
    searchTerm,
    searchValue,
    transactionUrl,
    transactionUrlExcluded,
  ]);

  const onChange = (updatedOptions: UrlOption[]) => {
    setItems(
      updatedOptions.map((item) => {
        const { isWildcard, checked } = item;
        if (isWildcard && checked === 'off') {
          return {
            ...item,
            checked: undefined,
          };
        }
        return item;
      })
    );
  };

  const onInputChange = (val: string) => {
    setSearchValue(val);
  };

  const isLoading = status !== 'success';

  const onApply = () => {
    const { includedItems, excludedItems } = processItems(items);

    onFilterChange(includedItems, excludedItems);

    updateSearchTerm(searchValue);

    setSearchValue('');
  };

  const hasChanged = () => {
    const { includedItems, excludedItems, includedWildcards } =
      processItems(items);

    let isWildcardChanged =
      (includedWildcards.length > 0 && !searchTerm) ||
      (includedWildcards.length === 0 && searchTerm);

    if (includedWildcards.length > 0) {
      isWildcardChanged = includedWildcards[0] !== searchTerm;
    }

    return (
      isWildcardChanged ||
      !isEqual(includedItems.sort(), (transactionUrl ?? []).sort()) ||
      !isEqual(excludedItems.sort(), (transactionUrlExcluded ?? []).sort())
    );
  };

  return (
    <SelectableUrlList
      loading={isLoading}
      onInputChange={onInputChange}
      data={{ items, total: data?.total ?? 0 }}
      onSelectionChange={onChange}
      searchValue={searchValue}
      popoverIsOpen={Boolean(popoverIsOpen)}
      setPopoverIsOpen={setPopoverIsOpen}
      onSelectionApply={onApply}
      renderOption={selectableRenderOptions}
      rowHeight={64}
      hasChanged={() => Boolean(hasChanged())}
    />
  );
}
