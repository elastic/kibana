/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { InfraLoadingPanel } from '../../../components/loading';
import { useMetricsDataViewContext } from './hooks/use_data_view';
import { HostsTable } from './components/hosts_table';
import { InfraClientStartDeps } from '../../../types';
import { useSourceContext } from '../../../containers/metrics_source';

export const HostsContent: React.FunctionComponent = () => {
  const {
    services: { data },
  } = useKibana<InfraClientStartDeps>();
  const { source } = useSourceContext();
  const [dateRange, setDateRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const { metricsDataView, hasFailedCreatingDataView, hasFailedFetchingDataView } =
    useMetricsDataViewContext();
  // needed to refresh the lens table when filters havent changed
  const [searchSessionId, setSearchSessionId] = useState(data.search.session.start());
  const [isLensLoading, setIsLensLoading] = useState(false);

  const onQuerySubmit = useCallback(
    (payload: { dateRange: TimeRange; query?: Query }) => {
      setDateRange(payload.dateRange);
      if (payload.query) {
        setQuery(payload.query);
      }
      setIsLensLoading(true);
      setSearchSessionId(data.search.session.start());
    },
    [setDateRange, setQuery, data.search.session]
  );

  const onLoading = useCallback(
    (isLoading: boolean) => {
      if (isLensLoading) {
        setIsLensLoading(isLoading);
      }
    },
    [setIsLensLoading, isLensLoading]
  );

  const onRefetch = useCallback(() => {
    setIsLensLoading(true);
    setSearchSessionId(data.search.session.start());
  }, [data.search.session]);

  return (
    <div>
      {metricsDataView ? (
        <>
          <SearchBar
            showFilterBar={false}
            showDatePicker={true}
            showAutoRefreshOnly={false}
            showSaveQuery={true}
            showQueryInput={true}
            query={query}
            dateRangeFrom={dateRange.from}
            dateRangeTo={dateRange.to}
            indexPatterns={[metricsDataView]}
            onQuerySubmit={onQuerySubmit}
          />
          <HostsTable
            dataView={metricsDataView}
            timeRange={dateRange}
            query={query}
            searchSessionId={searchSessionId}
            onRefetch={onRefetch}
            onLoading={onLoading}
            isLensLoading={isLensLoading}
          />
        </>
      ) : hasFailedCreatingDataView || hasFailedFetchingDataView ? (
        <div>
          <div>There was an error trying to load or create the Data View:</div>
          {source?.configuration.metricAlias}
        </div>
      ) : (
        <InfraLoadingPanel
          height="100vh"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      )}
    </div>
  );
};
