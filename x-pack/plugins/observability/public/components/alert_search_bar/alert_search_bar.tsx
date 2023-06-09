/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { Query } from '@kbn/es-query';
import { AlertsStatusFilter } from './components';
import { observabilityAlertFeatureIds } from '../../config/alert_feature_ids';
import { ALERT_STATUS_QUERY, DEFAULT_QUERIES, DEFAULT_QUERY_STRING } from './constants';
import { ObservabilityAlertSearchBarProps } from './types';
import { buildEsQuery } from '../../utils/build_es_query';
import { AlertStatus } from '../../../common/typings';

const getAlertStatusQuery = (status: string): Query[] => {
  return ALERT_STATUS_QUERY[status]
    ? [{ query: ALERT_STATUS_QUERY[status], language: 'kuery' }]
    : [];
};

export function ObservabilityAlertSearchBar({
  appName,
  defaultSearchQueries = DEFAULT_QUERIES,
  onEsQueryChange,
  onKueryChange,
  onRangeFromChange,
  onRangeToChange,
  onStatusChange,
  kuery,
  rangeFrom,
  rangeTo,
  services: { AlertsSearchBar, timeFilterService, useToasts },
  status,
}: ObservabilityAlertSearchBarProps) {
  const toasts = useToasts();

  const onAlertStatusChange = useCallback(
    (alertStatus: AlertStatus) => {
      onEsQueryChange(
        buildEsQuery(
          {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          [...getAlertStatusQuery(alertStatus), ...defaultSearchQueries]
        )
      );
    },
    [kuery, defaultSearchQueries, rangeFrom, rangeTo, onEsQueryChange]
  );

  useEffect(() => {
    onAlertStatusChange(status);
  }, [onAlertStatusChange, status]);

  const onSearchBarParamsChange = useCallback<
    (query: {
      dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
      query?: string;
    }) => void
  >(
    ({ dateRange, query }) => {
      try {
        // First try to create es query to make sure query is valid, then save it in state
        const esQuery = buildEsQuery(
          {
            to: dateRange.to,
            from: dateRange.from,
          },
          query,
          [...getAlertStatusQuery(status), ...defaultSearchQueries]
        );
        if (query) onKueryChange(query);
        timeFilterService.setTime(dateRange);
        onRangeFromChange(dateRange.from);
        onRangeToChange(dateRange.to);
        onEsQueryChange(esQuery);
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.observability.alerts.searchBar.invalidQueryTitle', {
            defaultMessage: 'Invalid query string',
          }),
        });
        onKueryChange(DEFAULT_QUERY_STRING);
      }
    },
    [
      defaultSearchQueries,
      timeFilterService,
      onRangeFromChange,
      onRangeToChange,
      onKueryChange,
      onEsQueryChange,
      status,
      toasts,
    ]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <AlertsSearchBar
          appName={appName}
          featureIds={observabilityAlertFeatureIds}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          query={kuery}
          onQuerySubmit={onSearchBarParamsChange}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter status={status} onChange={onStatusChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertSearchBar;
