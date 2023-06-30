/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  Filter,
  fromKueryExpression,
  Query,
  TimeRange,
  toElasticsearchQuery,
} from '@kbn/es-query';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiSkeletonRectangle } from '@elastic/eui';
import qs from 'query-string';
import { DataView, UI_SETTINGS } from '@kbn/data-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';
import { UIProcessorEvent } from '../../../../common/processor_event';
import { TimePickerTimeDefaults } from '../date_picker/typings';
import { ApmPluginStartDeps } from '../../../plugin';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { useProcessorEvent } from '../../../hooks/use_processor_event';
import { fromQuery, toQuery } from '../links/url_helpers';
import { useApmParams } from '../../../hooks/use_apm_params';
import { getBoolFilter } from '../get_bool_filter';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { clearCache } from '../../../services/rest/call_api';
import { useTimeRangeId } from '../../../context/time_range_id/use_time_range_id';
import {
  toBoolean,
  toNumber,
} from '../../../context/url_params_context/helpers';

export const DEFAULT_REFRESH_INTERVAL = 60000;

function useSearchBarParams(defaultKuery?: string) {
  const { path, query } = useApmParams('/*');
  const urlKuery = 'kuery' in query ? query.kuery : undefined;
  const serviceName = 'serviceName' in path ? path.serviceName : undefined;
  const groupId = 'groupId' in path ? path.groupId : undefined;
  const environment = 'environment' in query ? query.environment : undefined;
  const refreshIntervalFromUrl =
    'refreshInterval' in query
      ? toNumber(query.refreshInterval)
      : DEFAULT_REFRESH_INTERVAL;
  const refreshPausedFromUrl =
    'refreshPaused' in query ? query.refreshPaused : 'true';

  return {
    kuery: urlKuery
      ? {
          query: defaultKuery || urlKuery,
          language: 'kuery',
        }
      : undefined,
    serviceName,
    groupId,
    environment,
    refreshPausedFromUrl,
    refreshIntervalFromUrl,
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

function getSearchBarPlaceholder(
  searchbarPlaceholder?: string,
  processorEvent?: UIProcessorEvent
) {
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

function convertKueryToEsQuery(kuery: string, dataView: DataView) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, dataView);
}

export function UnifiedSearchBar({
  placeholder,
  value,
  showDatePicker = true,
  showSubmitButton = true,
  isClearable = true,
  boolFilter,
}: {
  placeholder?: string;
  value?: string;
  showDatePicker?: boolean;
  showSubmitButton?: boolean;
  isClearable?: boolean;
  boolFilter?: QueryDslQueryContainer[];
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

  const {
    kuery,
    serviceName,
    environment,
    groupId,
    refreshPausedFromUrl,
    refreshIntervalFromUrl,
  } = useSearchBarParams(value);
  const timePickerTimeDefaults = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );
  const urlTimeRange = useUrlTimeRange(timePickerTimeDefaults);
  const [displaySearchBar, setDisplaySearchBar] = useState(false);

  const syncSearchBarWithUrl = useCallback(() => {
    // Sync Kuery params with Search Bar
    if (kuery && !deepEqual(queryStringService.getQuery(), kuery)) {
      queryStringService.setQuery(kuery);
    }
    // On page navigation the search bar persists the state where as the url is cleared, hence we need to clear the search bar
    if (!kuery) {
      queryStringService.clearQuery();
    }
    // Sync Time Range with Search Bar
    timeFilterService.timefilter.setTime(urlTimeRange as TimeRange);

    // Sync Auto refresh interval with Search Bar
    const refreshInterval = {
      pause: toBoolean(refreshPausedFromUrl),
      value: refreshIntervalFromUrl,
    };
    timeFilterService.timefilter.setRefreshInterval(refreshInterval);
  }, [
    kuery,
    queryStringService,
    refreshIntervalFromUrl,
    refreshPausedFromUrl,
    timeFilterService.timefilter,
    urlTimeRange,
  ]);

  useEffect(() => {
    syncSearchBarWithUrl();
  }, [syncSearchBarWithUrl]);

  const location = useLocation();
  const history = useHistory();
  const { dataView } = useApmDataView();
  const { urlParams } = useLegacyUrlParams();
  const processorEvent = useProcessorEvent();
  const { incrementTimeRangeId } = useTimeRangeId();
  const searchbarPlaceholder = getSearchBarPlaceholder(
    placeholder,
    processorEvent
  );

  useEffect(() => {
    if (dataView) setDisplaySearchBar(true);
  }, [dataView]);

  const customFilters =
    boolFilter ??
    getBoolFilter({
      groupId,
      processorEvent,
      serviceName,
      environment,
      urlParams,
    });

  const filtersForSearchBarSuggestions = customFilters.map((filter) => {
    return {
      query: filter,
    } as Filter;
  });

  const onRefresh = () => {
    clearCache();
    incrementTimeRangeId();
  };

  const onRefreshChange = ({
    isPaused,
    refreshInterval,
  }: OnRefreshChangeProps) => {
    const existingQueryParams = toQuery(location.search);
    const updatedQueryParams = {
      ...existingQueryParams,
      refreshPaused: isPaused,
      refreshInterval,
    };

    history.push({
      ...location,
      search: fromQuery(updatedQueryParams),
    });
  };
  const handleSubmit = (
    payload: { dateRange: TimeRange; query?: Query },
    isUpdate?: boolean
  ) => {
    if (dataView == null) {
      return;
    }

    const { dateRange, query } = payload;
    const { from: rangeFrom, to: rangeTo } = dateRange;

    try {
      const res = convertKueryToEsQuery(
        query?.query as string,
        dataView as DataView
      );
      if (!res) {
        return;
      }

      const existingQueryParams = toQuery(location.search);
      const updatedQueryWithTime = {
        ...existingQueryParams,
        rangeFrom,
        rangeTo,
      };
      const newSearchParams = {
        ...updatedQueryWithTime,
        kuery: query?.query,
      };

      if (isUpdate) {
        history.push({
          ...location,
          search: fromQuery(newSearchParams),
        });
      } else {
        onRefresh();
      }
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  };

  return (
    <EuiSkeletonRectangle
      isLoading={!displaySearchBar}
      width="100%"
      height="40px"
    >
      <SearchBar
        appName={i18n.translate('xpack.apm.appName', {
          defaultMessage: 'APM',
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
        onRefresh={onRefresh}
        onRefreshChange={onRefreshChange}
        isClearable={isClearable}
        dataTestSubj="apmUnifiedSearchBar"
        filtersForSuggestions={filtersForSearchBarSuggestions}
      />
    </EuiSkeletonRectangle>
  );
}
