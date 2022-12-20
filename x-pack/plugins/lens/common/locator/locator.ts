/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { SerializableRecord } from '@kbn/utility-types';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/common';
import type { DateRange } from '../types';

export const LENS_APP_LOCATOR = 'LENS_APP_LOCATOR';

interface LensPartialState {
  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query;

  /**
   * Optionally set the date range in the date picker.
   */
  resolvedDateRange?: DateRange & SerializableRecord;

  /**
   * Optionally set the id of the used saved query
   */
  savedQuery?: SavedQuery & SerializableRecord;

  /**
   * Optionally set the visualization configuration
   */
  visualization?: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Optionally set the datasources configurations
   */
  datasourceStates?: Record<string, { isLoading: boolean; state: unknown }> & SerializableRecord;
}

export interface LensAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved object ID.
   */
  savedObjectId?: string;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Optionally apply filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query;

  /**
   * Optionally set the date range in the date picker.
   */
  resolvedDateRange?: DateRange & SerializableRecord;

  /**
   * Optionally set the id of the used saved query
   */
  savedQuery?: SavedQuery & SerializableRecord;

  /**
   * Optionally set the visualization configuration
   */
  visualization?: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Optionally set the datasources configurations
   */
  datasourceStates?: Record<string, { isLoading: boolean; state: unknown }> & SerializableRecord;
}

export type LensAppLocator = LocatorPublic<LensAppLocatorParams>;

export interface LensAppLocatorDependencies {
  useHash?: boolean;
}

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  dataViewSpec?: DataViewSpec;
}

export class LensAppLocatorDefinition implements LocatorDefinition<LensAppLocatorParams> {
  public readonly id = LENS_APP_LOCATOR;

  constructor(protected readonly deps: LensAppLocatorDependencies) {}

  public readonly getLocation = async (params: LensAppLocatorParams) => {
    const {
      filters,
      query,
      savedObjectId,
      resolvedDateRange,
      searchSessionId,
      visualization,
      datasourceStates,
    } = params;
    const appState: LensPartialState = {};
    const queryState: GlobalQueryStateFromUrl = {};
    const { isFilterPinned } = await import('@kbn/es-query');

    if (query) appState.query = query;
    if (resolvedDateRange) {
      queryState.time = { from: resolvedDateRange.fromDate, to: resolvedDateRange.toDate };
    }
    if (filters && filters.length) {
      appState.filters = filters?.filter((f) => !isFilterPinned(f));
      queryState.filters = appState.filters;
    }
    if (visualization) {
      appState.visualization = visualization;
    }
    if (datasourceStates) {
      appState.datasourceStates = datasourceStates;
    }

    const state: MainHistoryLocationState = {};

    const savedObjectPath = savedObjectId ? `edit/${encodeURIComponent(savedObjectId)}` : '';
    const url = new URL(window.location.href);
    url.hash = savedObjectPath;
    url.searchParams.append('_g', rison.encodeUnknown(queryState) || '');
    url.searchParams.append('_a', rison.encodeUnknown(appState) || '');

    if (searchSessionId) {
      url.searchParams.append('searchSessionId', searchSessionId);
    }

    return {
      app: 'lens',
      path: url.href,
      state,
    };
  };
}
