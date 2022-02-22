/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useStateContainer } from './state';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';

export function useQueryBar(data: DataPublicPluginStart, refresh: () => void) {
  const timefilterService = data.query.timefilter.timefilter;
  const { rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery } = useStateContainer();

  const onQueryBarQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        refresh();
        return;
      }
      timefilterService.setTime(dateRange);
      setRangeFrom(dateRange.from);
      setRangeTo(dateRange.to);
      setKuery(query);
    },
    [rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery, timefilterService, refresh]
  );
  return { onQueryBarQueryChange, rangeFrom, rangeTo, kuery };
}
