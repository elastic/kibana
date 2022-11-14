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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { observabilityAlertFeatureIds } from '../../../config';
import { ObservabilityAppServices } from '../../../application/types';
import { AlertsStatusFilter } from './components';
import { ALERT_STATUS_QUERY, DEFAULT_QUERIES, DEFAULT_QUERY_STRING } from './constants';
import { AlertSearchBarProps } from './types';
import { buildEsQuery } from '../../../utils/build_es_query';
import { AlertStatus } from '../../../../common/typings';

const getAlertStatusQuery = (status: string): Query[] => {
  return status ? [{ query: ALERT_STATUS_QUERY[status], language: 'kuery' }] : [];
};

export function ObservabilityAlertSearchBar({
  appName,
  rangeFrom,
  setRangeFrom,
  rangeTo,
  setRangeTo,
  kuery,
  setKuery,
  status,
  setStatus,
  setEsQuery,
  queries = DEFAULT_QUERIES,
}: AlertSearchBarProps) {
  const {
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
    notifications: { toasts },
    triggersActionsUi: { getAlertsSearchBar: AlertsSearchBar },
  } = useKibana<ObservabilityAppServices>().services;

  const onStatusChange = useCallback(
    (alertStatus: AlertStatus) => {
      setEsQuery(
        buildEsQuery(
          {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          [...getAlertStatusQuery(alertStatus), ...queries]
        )
      );
    },
    [kuery, queries, rangeFrom, rangeTo, setEsQuery]
  );

  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);

  const onSearchBarParamsChange = useCallback(
    ({ dateRange, query }) => {
      try {
        // First try to create es query to make sure query is valid, then save it in state
        const esQuery = buildEsQuery(
          {
            to: rangeTo,
            from: rangeFrom,
          },
          query,
          [...getAlertStatusQuery(status), ...queries]
        );
        setKuery(query);
        timeFilterService.setTime(dateRange);
        setRangeFrom(dateRange.from);
        setRangeTo(dateRange.to);
        setEsQuery(esQuery);
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.observability.alerts.searchBar.invalidQueryTitle', {
            defaultMessage: 'Invalid query string',
          }),
        });
        setKuery(DEFAULT_QUERY_STRING);
      }
    },
    [
      timeFilterService,
      setRangeFrom,
      setRangeTo,
      setKuery,
      setEsQuery,
      rangeTo,
      rangeFrom,
      status,
      queries,
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
          onQueryChange={onSearchBarParamsChange}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter
              status={status}
              onChange={(id) => {
                setStatus(id as AlertStatus);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
