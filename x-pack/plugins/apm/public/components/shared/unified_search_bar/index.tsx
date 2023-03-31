/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Query, TimeRange } from '@kbn/es-query';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiSkeletonRectangle } from '@elastic/eui';
import qs from 'query-string';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { TimePickerTimeDefaults } from '../date_picker/typings';
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

function useUrlTimeRange(defaultTimeRange: TimeRange) {
  const location = useLocation();
  const query = qs.parse(location.search);

  const isDateRangeSet = 'rangeFrom' in query && 'rangeTo' in query;

  if (isDateRangeSet) {
    return {
      from: query.rangeFrom,
      to: query.rangeTo,
    };
  }
  return defaultTimeRange;
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
    core,
  } = useApmPluginContext();
  const { services } = useKibana<ApmPluginStartDeps>();

  const {
    data: {
      query: { queryString: queryStringService, timefilter: timeFilterService },
    },
  } = services;

  const urlQuery = useKueryParams(value);
  const timePickerTimeDefaults = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );
  const urlTimeRange = useUrlTimeRange(timePickerTimeDefaults);
  const [displaySearchBar, setDisplaySearchBar] = useState(false);

  const syncSearchBarWithUrl = useCallback(() => {
    // Sync Kuery params with Search Bar
    if (urlQuery && !deepEqual(queryStringService.getQuery(), urlQuery)) {
      queryStringService.setQuery(urlQuery);
    }
    // On page navigation the search bar persists the state where as the url is cleared, hence we need to clear the search bar
    if (!urlQuery) {
      queryStringService.clearQuery();
    }
    // Sync Time Range with Search Bar
    timeFilterService.timefilter.setTime(urlTimeRange as TimeRange);
  }, [urlQuery, queryStringService, timeFilterService, urlTimeRange]);

  useEffect(() => {
    syncSearchBarWithUrl();
  }, [syncSearchBarWithUrl]);

  const location = useLocation();
  const history = useHistory();
  const { dataView } = useApmDataView();
  const searchbarPlaceholder = useSearchBarPlaceholder(placeholder);

  useEffect(() => {
    if (dataView) setDisplaySearchBar(true);
  }, [dataView]);
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
    <EuiSkeletonRectangle
      isLoading={!displaySearchBar}
      width="100%"
      height="40px"
    >
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
        dataTestSubj="apmUnifiedSearchBar"
      />
    </EuiSkeletonRectangle>
  );
}
