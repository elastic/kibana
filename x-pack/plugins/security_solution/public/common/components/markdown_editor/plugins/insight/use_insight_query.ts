/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { noop } from 'lodash/fp';
import deepEqual from 'fast-deep-equal';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { Subscription } from 'rxjs';

import type { DataProvider } from '@kbn/timelines-plugin/common';
import { useHttp, useKibana } from '../../../../lib/kibana';
import { convertKueryToElasticSearchQuery, combineQueries } from '../../../../lib/kuery';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import type { inputsModel } from '../../../../store';
import type { ESQuery } from '../../../../../../common/typed_json';

import { useTimelineDataFilters } from '../../../../../timelines/containers/use_timeline_data_filters';
import { useTimelineEvents } from '../../../../../timelines/containers';
import { getDataProvider } from '../../../event_details/table/use_action_cell_data_provider';
import { useSourcererDataView } from '../../../../containers/sourcerer';
import { SourcererScopeName } from '../../../../store/sourcerer/model';
import { TimelineId } from '../../../../common/types/timeline';
import {
  TimelineEventsQueries,
  TimelineRequestOptionsPaginated,
} from '../../../../../../common/search_strategy';

interface UseInsightQuery {
  dataProviders: DataProvider[];
  scopeId: string;
  alertData: any;
}

interface InsightRequest {
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  factoryQueryType?: string;
  entityType?: string;
  fieldsRequested: string[];
}

interface InisghtResponse {
  rawResponse: any;
}

export const useInsightQuery = ({ dataProviders, scopeId, alertData }: UseInsightQuery): any => {
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const { browserFields, selectedPatterns, indexPattern, dataViewId } = useSourcererDataView(
    SourcererScopeName.timeline
  );
  const combinedQueries = combineQueries({
    config: esQueryConfig,
    dataProviders,
    indexPattern,
    browserFields,
    filters: [],
    kqlQuery: {
      query: '',
      language: 'kuery',
    },
    kqlMode: 'filter',
  });
  const [isQueryLoading, { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch }] =
    useTimelineEvents({
      dataViewId,
      fields: ['*'],
      filterQuery: combinedQueries?.filterQuery,
      id: 'timeline-1',
      indexNames: selectedPatterns,
      language: 'kuery',
      limit: 1,
      runtimeMappings: {},
    });
  return {
    isQueryLoading,
    totalCount,
  };
};
