/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { BoolQuery } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { AlertsFeatureIdsFilter } from '../../lib/search_filters';
import { useKibana } from '../../..';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import { ALERTS_URL_STORAGE_KEY } from './constants';
import { AlertsSearchBarProps } from './types';
import AlertsSearchBar from './alerts_search_bar';
import { nonNullable } from '../../../../common/utils';
import { buildEsQuery } from './build_es_query';

const INVALID_QUERY_STRING_TOAST_TITLE = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.invalidQueryTitle',
  {
    defaultMessage: 'Invalid query string',
  }
);

export type UrlSyncedAlertsSearchBarProps = Omit<
  AlertsSearchBarProps,
  'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'
> & {
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
  onActiveFeatureFiltersChange?: (value: AlertConsumers[]) => void;
};

/**
 * An abstraction over AlertsSearchBar that syncs the query state with the url
 */
export const UrlSyncedAlertsSearchBar = ({
  onEsQueryChange,
  onActiveFeatureFiltersChange,
  ...rest
}: UrlSyncedAlertsSearchBarProps) => {
  const {
    data: { query: queryService },
    notifications: { toasts },
  } = useKibana().services;
  const {
    timefilter: { timefilter: timeFilterService },
  } = queryService;
  const {
    kuery,
    rangeFrom,
    rangeTo,
    filters,
    onKueryChange,
    onRangeFromChange,
    onRangeToChange,
    onFiltersChange,
    savedQuery,
    setSavedQuery,
    clearSavedQuery,
  } = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY);

  useEffect(() => {
    try {
      onActiveFeatureFiltersChange?.([
        ...new Set(
          filters
            .flatMap((f) => (f as AlertsFeatureIdsFilter).meta.alertsFeatureIds)
            .filter(nonNullable)
        ),
      ]);
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          filters,
        })
      );
    } catch (error) {
      toasts.addError(error, {
        title: INVALID_QUERY_STRING_TOAST_TITLE,
      });
      onKueryChange('');
    }
  }, [
    filters,
    kuery,
    onActiveFeatureFiltersChange,
    onEsQueryChange,
    onKueryChange,
    rangeFrom,
    rangeTo,
    toasts,
  ]);

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query, dateRange }) => {
      setSavedQuery(undefined);
      timeFilterService.setTime(dateRange);
      onKueryChange(query ?? '');
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);
    },
    [onKueryChange, onRangeFromChange, onRangeToChange, setSavedQuery, timeFilterService]
  );

  return (
    <AlertsSearchBar
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      query={kuery}
      onQuerySubmit={onQueryChange}
      filters={filters}
      onFiltersUpdated={onFiltersChange}
      savedQuery={savedQuery}
      onSavedQueryUpdated={setSavedQuery}
      onClearSavedQuery={clearSavedQuery}
      {...rest}
    />
  );
};
