/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { BoolQuery, FILTERS, PhraseFilter } from '@kbn/es-query';
import { ALERT_RULE_PRODUCER, AlertConsumers } from '@kbn/rule-data-utils';
import { buildEsQuery } from '../global_alerts';
import { useKibana } from '../../..';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import { ALERTS_URL_STORAGE_KEY, NON_SIEM_FEATURE_IDS } from './constants';
import { AlertsSearchBarProps } from './types';
import AlertsSearchBar from './alerts_search_bar';

export type UrlSyncedAlertsSearchBarProps = Omit<
  AlertsSearchBarProps,
  'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'
> & {
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
  onFeatureIdsChange: (featureIds: AlertConsumers[]) => void;
  onFilteringBySolutionChange?: (value: boolean) => void;
};

export const UrlSyncedAlertsSearchBar = ({
  onEsQueryChange,
  onFeatureIdsChange,
  onFilteringBySolutionChange,
  ...rest
}: UrlSyncedAlertsSearchBarProps) => {
  const {
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
  } = useKibana().services;
  const {
    kuery,
    rangeFrom,
    rangeTo,
    filters,
    onKueryChange,
    onRangeFromChange,
    onRangeToChange,
    onFiltersChange,
  } = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY);

  const syncEsQuery = useCallback(() => {
    try {
      const solutionFilters = filters.filter(
        (f) =>
          f.meta.key === ALERT_RULE_PRODUCER &&
          (f.meta.type === FILTERS.PHRASE || f.meta.type === FILTERS.PHRASES)
      );
      onFilteringBySolutionChange?.(solutionFilters.length > 0);
      onFeatureIdsChange(
        !solutionFilters.length ||
          solutionFilters.filter(
            (f) => (f as PhraseFilter).meta.params?.query !== AlertConsumers.SIEM
          ).length > 0
          ? NON_SIEM_FEATURE_IDS
          : [AlertConsumers.SIEM]
      );
      const newQuery = buildEsQuery({
        timeRange: {
          to: rangeTo,
          from: rangeFrom,
        },
        kuery,
        filters,
      });
      onEsQueryChange(newQuery);
    } catch (e) {
      // TODO show message?
    }
  }, [
    filters,
    kuery,
    onEsQueryChange,
    onFeatureIdsChange,
    onFilteringBySolutionChange,
    rangeFrom,
    rangeTo,
  ]);

  useEffect(() => {
    syncEsQuery();
  }, [syncEsQuery]);

  const onQueryChange = useCallback<Exclude<AlertsSearchBarProps['onQueryChange'], undefined>>(
    ({ query, dateRange }) => {
      timeFilterService.setTime(dateRange);
      onKueryChange(query ?? '');
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);

      syncEsQuery();
    },
    [onKueryChange, onRangeFromChange, onRangeToChange, syncEsQuery, timeFilterService]
  );

  return (
    <AlertsSearchBar
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      query={kuery}
      onQuerySubmit={onQueryChange}
      filters={filters}
      onFiltersUpdated={onFiltersChange}
      {...rest}
    />
  );
};
