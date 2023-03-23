/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { isEqual, map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SelectableUrlList, UrlOption } from './selectable_url_list';
import { SeriesConfig, SeriesUrl, UrlFilter } from '../../types';
import { useUrlSearch } from './use_url_search';
import { useSeriesFilters } from '../../hooks/use_series_filters';
import { TRANSACTION_URL } from '../../configurations/constants/elasticsearch_fieldnames';

interface Props {
  seriesId: number;
  seriesConfig: SeriesConfig;
  series: SeriesUrl;
}

const processSelectedItems = (items: UrlOption[]) => {
  const urlItems = items.filter(({ isWildcard }) => !isWildcard);

  const wildcardItems = items.filter(({ isWildcard }) => isWildcard);

  const includedItems = map(
    urlItems.filter((option) => option.checked === 'on'),
    'label'
  );

  const excludedItems = map(
    urlItems.filter((option) => option.checked === 'off'),
    'label'
  );

  // for wild cards we use title since label contains extra information
  const includedWildcards = map(
    wildcardItems.filter((option) => option.checked === 'on'),
    'title'
  );

  // for wild cards we use title since label contains extra information
  const excludedWildcards = map(
    wildcardItems.filter((option) => option.checked === 'off'),
    'title'
  );

  return { includedItems, excludedItems, includedWildcards, excludedWildcards };
};

const getWildcardLabel = (wildcard: string) => {
  return i18n.translate('xpack.observability.urlFilter.wildcard', {
    defaultMessage: 'Use wildcard *{wildcard}*',
    values: { wildcard },
  });
};

export function URLSearch({ series, seriesConfig, seriesId }: Props) {
  const [popoverIsOpen, setPopoverIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [items, setItems] = useState<UrlOption[]>([]);

  const { values, loading } = useUrlSearch({
    query,
    series,
    seriesConfig,
    seriesId,
  });

  useEffect(() => {
    const queryLabel = getWildcardLabel(query);
    const currFilter: UrlFilter | undefined = (series.filters ?? []).find(
      ({ field }) => field === TRANSACTION_URL
    );

    const {
      wildcards = [],
      notWildcards = [],
      values: currValues = [],
      notValues: currNotValues = [],
    } = currFilter ?? { field: TRANSACTION_URL };

    setItems((prevItems) => {
      const { includedItems, excludedItems } = processSelectedItems(prevItems);

      const newItems: UrlOption[] = (values ?? []).map((item) => {
        if (
          includedItems.includes(item.label) ||
          wildcards.includes(item.label) ||
          currValues.includes(item.label)
        ) {
          return { ...item, checked: 'on', title: item.label };
        }
        if (
          excludedItems.includes(item.label) ||
          notWildcards.includes(item.label) ||
          currNotValues.includes(item.label)
        ) {
          return { ...item, checked: 'off', title: item.label, ...item };
        }
        return { ...item, title: item.label, checked: undefined };
      });

      wildcards.forEach((wildcard) => {
        newItems.unshift({
          title: wildcard,
          label: getWildcardLabel(wildcard),
          isWildcard: true,
          checked: 'on',
        });
      });

      notWildcards.forEach((wildcard) => {
        newItems.unshift({
          title: wildcard,
          label: getWildcardLabel(wildcard),
          isWildcard: true,
          checked: 'off',
        });
      });

      let queryItem: UrlOption | undefined = prevItems.find(({ isNewWildcard }) => isNewWildcard);
      if (query) {
        if (!queryItem) {
          queryItem = {
            title: query,
            label: queryLabel,
            isNewWildcard: true,
            isWildcard: true,
          };
          newItems.unshift(queryItem);
        }

        return [{ ...queryItem, label: queryLabel, title: query }, ...newItems];
      }

      return newItems;
    });
    // we don't want to add series in the dependency, for that we have an extra side effect below
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [values, loading, query]);

  useEffect(() => {
    const currFilter: UrlFilter | undefined = (series.filters ?? []).find(
      ({ field }) => field === TRANSACTION_URL
    );

    const {
      wildcards = [],
      notWildcards = [],
      values: currValues = [],
      notValues: currNotValues = [],
    } = currFilter ?? { field: TRANSACTION_URL };

    setItems((prevItems) => {
      const newItems: UrlOption[] = (prevItems ?? []).map((item) => {
        if (currValues.includes(item.label) || wildcards.includes(item.title)) {
          return { ...item, checked: 'on' };
        }

        if (currNotValues.includes(item.label) || notWildcards.includes(item.title)) {
          return { ...item, checked: 'off' };
        }
        return { ...item, checked: undefined };
      });

      return newItems;
    });
  }, [series]);

  const onSelectionChange = (updatedOptions: UrlOption[]) => {
    setItems(updatedOptions);
  };

  const { replaceFilter } = useSeriesFilters({ seriesId, series });

  const onSelectionApply = () => {
    const { includedItems, excludedItems, includedWildcards, excludedWildcards } =
      processSelectedItems(items);

    replaceFilter({
      field: TRANSACTION_URL,
      values: includedItems,
      notValues: excludedItems,
      wildcards: includedWildcards,
      notWildcards: excludedWildcards,
    });

    setQuery('');
    setPopoverIsOpen(false);
  };

  const hasChanged = () => {
    const { includedItems, excludedItems, includedWildcards, excludedWildcards } =
      processSelectedItems(items);
    const currFilter: UrlFilter | undefined = (series.filters ?? []).find(
      ({ field }) => field === TRANSACTION_URL
    );

    const {
      wildcards = [],
      notWildcards = [],
      values: currValues = [],
      notValues: currNotValues = [],
    } = currFilter ?? { field: TRANSACTION_URL };

    return (
      !isEqual(includedItems.sort(), currValues.sort()) ||
      !isEqual(excludedItems.sort(), currNotValues.sort()) ||
      !isEqual(wildcards.sort(), includedWildcards.sort()) ||
      !isEqual(notWildcards.sort(), excludedWildcards.sort())
    );
  };

  return (
    <SelectableUrlList
      loading={Boolean(loading)}
      onInputChange={(val) => setQuery(val)}
      data={{ items, total: items.length }}
      onSelectionChange={onSelectionChange}
      searchValue={query}
      popoverIsOpen={popoverIsOpen}
      setPopoverIsOpen={setPopoverIsOpen}
      onSelectionApply={onSelectionApply}
      hasChanged={hasChanged}
    />
  );
}
