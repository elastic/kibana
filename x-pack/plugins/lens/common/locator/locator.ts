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
import type { Filter, Query } from '@kbn/es-query';
import type { DataViewSpec, SavedQuery } from '@kbn/data-plugin/common';
import { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DateRange } from '../types';

export const LENS_APP_LOCATOR = 'LENS_APP_LOCATOR';
export const LENS_SHARE_STATE_ACTION = 'LENS_SHARE_STATE_ACTION';

interface LensShareableState {
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
   * Set the visualization configuration
   */
  visualization: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Set the active datasource used
   */
  activeDatasourceId?: string;

  /**
   * Set the datasources configurations
   */
  datasourceStates: Record<string, unknown> & SerializableRecord;

  /**
   * Background search session id
   */
  searchSessionId?: string;

  /**
   * Set the references used in the Lens state
   */
  references: Array<SavedObjectReference & SerializableRecord>;

  /**
   * Pass adHoc dataViews specs used in the Lens state
   */
  dataViewSpecs?: DataViewSpec[];
}

export interface LensAppLocatorParams extends SerializableRecord {
  /**
   * Optionally set saved object ID.
   */
  savedObjectId?: string;

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
   * In case of no savedObjectId passed, the properties above have to be passed
   */

  /**
   * Set the active datasource used
   */
  activeDatasourceId?: string | null;

  /**
   * Set the visualization configuration
   */
  visualization?: { activeId: string | null; state: unknown } & SerializableRecord;

  /**
   * Set the datasources configurations
   */
  datasourceStates?: Record<string, { state: unknown }> & SerializableRecord;

  /**
   * Set the references used in the Lens state
   */
  references?: Array<SavedObjectReference & SerializableRecord>;

  /**
   * Pass adHoc dataViews specs used in the Lens state
   */
  dataViewSpecs?: DataViewSpec[];
}

export type LensAppLocator = LocatorPublic<LensAppLocatorParams>;

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  type: typeof LENS_SHARE_STATE_ACTION;
  payload:
    | LensShareableState
    | Omit<
        LensShareableState,
        'activeDatasourceId' | 'visualization' | 'datasourceStates' | 'references'
      >;
}

function getStateFromParams(params: LensAppLocatorParams): MainHistoryLocationState['payload'] {
  if (params.savedObjectId) {
    return {};
  }

  // return no state for malformed state?
  if (
    !(
      params.activeDatasourceId &&
      params.datasourceStates &&
      params.visualization &&
      params.references
    )
  ) {
    return {};
  }
  return {
    activeDatasourceId: params.activeDatasourceId!,
    visualization: params.visualization!,
    datasourceStates: Object.fromEntries(
      Object.entries(params.datasourceStates!).map(([id, { state }]) => [id, state])
    ) as Record<string, { state: unknown }> & SerializableRecord,
    references: params.references!,
    dataViewSpecs: params.dataViewSpecs,
  };
}

export class LensAppLocatorDefinition implements LocatorDefinition<LensAppLocatorParams> {
  public readonly id = LENS_APP_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: LensAppLocatorParams) => {
    const { filters, query, savedObjectId, resolvedDateRange, searchSessionId } = params;
    const appState = getStateFromParams(params);
    const queryState: GlobalQueryStateFromUrl = {};
    const { isFilterPinned } = await import('@kbn/es-query');

    if (query) {
      appState.query = query;
    }
    if (resolvedDateRange) {
      appState.resolvedDateRange = resolvedDateRange;
      queryState.time = { from: resolvedDateRange.fromDate, to: resolvedDateRange.toDate };
    }
    if (filters?.length) {
      appState.filters = filters;
      queryState.filters = filters?.filter((f) => !isFilterPinned(f));
    }

    const savedObjectPath = savedObjectId ? `/edit/${encodeURIComponent(savedObjectId)}` : '';
    const basepath = `${window.location.origin}${window.location.pathname}`;
    const url = new URL(basepath);
    url.hash = savedObjectPath;
    url.searchParams.append('_g', rison.encodeUnknown(queryState) || '');

    if (searchSessionId) {
      appState.searchSessionId = searchSessionId;
    }

    return {
      app: 'lens',
      path: url.href.replace(basepath, ''),
      state: { type: LENS_SHARE_STATE_ACTION, payload: appState },
    };
  };
}
