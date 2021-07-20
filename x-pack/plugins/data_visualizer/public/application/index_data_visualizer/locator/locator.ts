/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { encode } from 'rison-node';
import { stringify } from 'query-string';
import { SerializableState } from '../../../../../../../src/plugins/kibana_utils/common';
import { RefreshInterval, TimeRange } from '../../../../../../../src/plugins/data/common';
import { LocatorDefinition, LocatorPublic } from '../../../../../../../src/plugins/share/common';
import { QueryState } from '../../../../../../../src/plugins/data/public';
import { Dictionary, isRisonSerializationRequired } from '../../common/util/url_state';
import { SearchQueryLanguage } from '../types/combined_query';

export const DATA_VISUALIZER_APP_LOCATOR = 'DATA_VISUALIZER_APP_LOCATOR';

export interface IndexDataVisualizerLocatorParams extends SerializableState {
  /**
   * Optionally set saved search ID.
   */
  savedSearchId?: string;

  /**
   * Optionally set index pattern ID.
   */
  indexPatternId?: string;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableState;

  /**
   * Optionally set a query.
   */
  query?: {
    searchQuery: SerializableState;
    searchString: string | SerializableState;
    searchQueryLanguage: SearchQueryLanguage;
  };

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
}

export type IndexDataVisualizerLocator = LocatorPublic<IndexDataVisualizerLocatorParams>;

export class IndexDataVisualizerLocatorDefinition
  implements LocatorDefinition<IndexDataVisualizerLocatorParams> {
  public readonly id = DATA_VISUALIZER_APP_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: IndexDataVisualizerLocatorParams) => {
    const {
      indexPatternId,
      query,
      refreshInterval,
      savedSearchId,
      timeRange,
      visibleFieldNames,
      visibleFieldTypes,
    } = params;

    const appState: {
      searchQuery?: { [key: string]: any };
      searchQueryLanguage?: string;
      searchString?: string | SerializableState;
      visibleFieldNames?: string[];
      visibleFieldTypes?: string[];
    } = {};
    const queryState: QueryState = {};

    if (query) {
      appState.searchQuery = query.searchQuery;
      appState.searchString = query.searchString;
      appState.searchQueryLanguage = query.searchQueryLanguage;
    }
    if (visibleFieldNames) appState.visibleFieldNames = visibleFieldNames;
    if (visibleFieldTypes) appState.visibleFieldTypes = visibleFieldTypes;

    if (timeRange) queryState.time = timeRange;
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    const urlState: Dictionary<any> = {
      ...(savedSearchId ? { savedSearchId } : { index: indexPatternId }),
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
