/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { Query, TimeRange } from '@kbn/es-query';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { ApmPluginStartDeps } from '../../../plugin';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { useProcessorEvent } from '../kuery_bar/use_processor_event';
import { fromQuery, toQuery } from '../links/url_helpers';
import { useApmParams } from '../../../hooks/use_apm_params';

function useKueryParams(defaultKuery?: string) {
  const { query } = useApmParams('/*');
  const kuery = 'kuery' in query ? query.kuery : undefined;

  if (!kuery) {
    return;
  }

  return {
    query: defaultKuery || kuery,
    language: 'kuery',
  };
}
function useSearchBarPlaceholder(searchbarPlaceholder?: string) {
  const processorEvent = useProcessorEvent();
  const examples = {
    transaction: 'transaction.duration.us > 300000',
    error: 'http.response.status_code >= 400',
    metric: 'process.pid = "1234"',
    defaults:
      'transaction.duration.us > 300000 AND http.response.status_code >= 400',
  };
  const example = examples[processorEvent || 'defaults'];

  return (
    searchbarPlaceholder ??
    i18n.translate('xpack.apm.unifiedSearchBar.placeholder', {
      defaultMessage: `Search {event, select,
            transaction {transactions}
            metric {metrics}
            error {errors}
            other {transactions, errors and metrics}
          } (E.g. {queryExample})`,
      values: {
        queryExample: example,
        event: processorEvent,
      },
    })
  );
}

export function UnifiedSearchBar({
  placeholder,
  value,
  showDatePicker = true,
  showSubmitButton = true,
  isClearable = true,
}: {
  placeholder?: string;
  value?: string;
  showDatePicker?: boolean;
  showSubmitButton?: boolean;
  isClearable?: boolean;
}) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useApmPluginContext();
  const { services } = useKibana<ApmPluginStartDeps>();

  const {
    data: {
      query: { queryString: queryStringService },
    },
  } = services;

  const urlQuery = useKueryParams(value);

  const syncSearchBarWithUrl = useCallback(() => {
    if (urlQuery && !deepEqual(queryStringService.getQuery(), urlQuery)) {
      queryStringService.setQuery(urlQuery);
    }
    if (!urlQuery) {
      queryStringService.clearQuery();
    }
  }, [queryStringService, urlQuery]);

  useEffectOnce(() => {
    syncSearchBarWithUrl();
  });

  const location = useLocation();
  const history = useHistory();
  const { dataView } = useApmDataView();
  const searchbarPlaceholder = useSearchBarPlaceholder(placeholder);

  const handleSubmit = (payload: { dateRange: TimeRange; query?: Query }) => {
    const { dateRange, query } = payload;
    const { from: rangeFrom, to: rangeTo } = dateRange;
    const toQueryId = toQuery(location.search);
    const updatedQueryWithTime = { ...toQueryId, rangeFrom, rangeTo };
    const fromQueryId = fromQuery({
      ...updatedQueryWithTime,
      kuery: query?.query,
    });
    const queryToPush = {
      ...location,
      search: fromQueryId,
    };
    history.push(queryToPush);
  };

  return (
    <SearchBar
      appName={i18n.translate('xpack.apm.appName', {
        defaultMessage: 'Service Transaction',
      })}
      iconType="search"
      placeholder={searchbarPlaceholder}
      useDefaultBehaviors={true}
      indexPatterns={dataView ? [dataView] : undefined}
      showQueryInput={true}
      showQueryMenu={false}
      showFilterBar={false}
      showDatePicker={showDatePicker}
      showSubmitButton={showSubmitButton}
      displayStyle="inPage"
      onQuerySubmit={handleSubmit}
      isClearable={isClearable}
      data-test-subj="apmUnifiedSearchBar"
    />
  );
}
