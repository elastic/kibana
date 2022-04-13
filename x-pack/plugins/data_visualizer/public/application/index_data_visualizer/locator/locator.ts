/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { SerializableRecord } from '@kbn/utility-types';
import { Filter } from '@kbn/es-query';
import { RefreshInterval, TimeRange } from '../../../../../../../src/plugins/data/common';
import { LocatorDefinition, LocatorPublic } from '../../../../../../../src/plugins/share/common';
import { QueryState } from '../../../../../../../src/plugins/data/public';
import { Dictionary, isRisonSerializationRequired } from '../../common/util/url_state';
import { SearchQueryLanguage } from '../types/combined_query';

export const DATA_VISUALIZER_APP_LOCATOR = 'DATA_VISUALIZER_APP_LOCATOR';

export interface IndexDataVisualizerLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved search ID.
   */
  savedSearchId?: string;

  /**
   * Optionally set data view ID.
   */
  dataViewId?: string;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

  /**
   * Optionally set a query.
   */
  query?: {
    searchQuery: SerializableRecord;
    searchString: string | SerializableRecord;
    searchQueryLanguage: SearchQueryLanguage;
  };

  /**
   * Optionally set individual query settings.
   */
  searchQuery?: SerializableRecord;
  searchString?: string | SerializableRecord;
  searchQueryLanguage?: SearchQueryLanguage;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;
  /**
   * Optionally set visible field names.
   */
  visibleFieldNames?: string[];
  /**
   * Optionally set visible field types.
   */
  visibleFieldTypes?: string[];
  searchSessionId?: string;
  filters?: Filter[];
  showAllFields?: boolean;
  showEmptyFields?: boolean;
  pageSize?: number;
  sortDirection?: 'asc' | 'desc';
  samplerShardSize?: number;
  pageIndex?: number;
  sortField?: string;
  showDistributions?: number;
}

export type IndexDataVisualizerLocator = LocatorPublic<IndexDataVisualizerLocatorParams>;

export class IndexDataVisualizerLocatorDefinition
  implements LocatorDefinition<IndexDataVisualizerLocatorParams>
{
  public readonly id = DATA_VISUALIZER_APP_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: IndexDataVisualizerLocatorParams) => {
    const {
      dataViewId,
      query,
      refreshInterval,
      savedSearchId,
      timeRange,
      visibleFieldNames,
      visibleFieldTypes,
      searchSessionId,
      filters,
      showAllFields,
      showEmptyFields,
      pageSize,
      sortDirection,
      samplerShardSize,
      pageIndex,
      sortField,
      showDistributions,
    } = params;

    const appState: {
      searchQuery?: { [key: string]: any };
      searchQueryLanguage?: string;
      searchString?: string | SerializableRecord;
      visibleFieldNames?: string[];
      visibleFieldTypes?: string[];
      filters?: Filter[];
      showAllFields?: boolean;
      showEmptyFields?: boolean;
      pageSize?: number;
      sortDirection?: 'asc' | 'desc';
      samplerShardSize?: number;
      pageIndex?: number;
      sortField?: string;
      showDistributions?: number;
    } = {};
    const queryState: QueryState = {};

    if (query) {
      appState.searchQuery = query.searchQuery;
      appState.searchString = query.searchString;
      appState.searchQueryLanguage = query.searchQueryLanguage;
    }

    if (params.searchString) {
      appState.searchQuery = params.searchQuery;
      appState.searchString = params.searchString;
      appState.searchQueryLanguage = params.searchQueryLanguage;
    }

    if (filters) {
      appState.filters = filters;
    }

    if (visibleFieldNames) appState.visibleFieldNames = visibleFieldNames;
    if (visibleFieldTypes) appState.visibleFieldTypes = visibleFieldTypes;

    if (pageSize) appState.pageSize = pageSize;
    if (sortDirection) appState.sortDirection = sortDirection;
    if (samplerShardSize) appState.samplerShardSize = samplerShardSize;
    if (pageIndex) appState.pageIndex = pageIndex;
    if (sortField) appState.sortField = sortField;
    if (showDistributions !== undefined) appState.showDistributions = showDistributions;
    if (showAllFields !== undefined) appState.showAllFields = showAllFields;
    if (showEmptyFields !== undefined) appState.showEmptyFields = showEmptyFields;

    if (timeRange) queryState.time = timeRange;
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    const urlState: Dictionary<any> = {
      ...(savedSearchId ? { savedSearchId } : { index: dataViewId }),
      ...(searchSessionId ? { searchSessionId } : {}),
      _a: { DATA_VISUALIZER_INDEX_VIEWER: appState },
      _g: queryState,
    };

    const parsedQueryString: Dictionary<any> = {};
    Object.keys(urlState).forEach((a) => {
      if (isRisonSerializationRequired(a)) {
        parsedQueryString[a] = encode(urlState[a]);
      } else {
        parsedQueryString[a] = urlState[a];
      }
    });

    const newLocationSearchString = stringify(parsedQueryString, {
      sort: false,
      encode: false,
    });

    const path = `/jobs/new_job/datavisualizer?${newLocationSearchString}`;
    return {
      app: 'ml',
      path,
      state: {},
    };
  };
}
