/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public';
import {
  TimeRange,
  Filter,
  Query,
  esFilters,
  QueryState,
  RefreshInterval,
} from '../../../../src/plugins/data/public';
import { setStateToKbnUrl } from '../../../../src/plugins/kibana_utils/public';
import { JobId } from '../../reporting/common/types';
import { ExplorerAppState } from './application/explorer/explorer_dashboard_service';

export const ML_APP_URL_GENERATOR = 'ML_APP_URL_GENERATOR';

export interface ExplorerUrlState {
  /**
   * ML App Page
   */
  page: 'explorer';
  /**
   * Job IDs
   */
  jobIds: JobId[];
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  /**
   * Optional state for the swim lane
   */
  mlExplorerSwimlane?: ExplorerAppState['mlExplorerSwimlane'];
  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;

  /**
   * Optionally apply filers.
   */
  filters?: Filter[];

  /**
   * Optionally set a query.
   */
  query?: Query;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;
}

/**
 * Union type of ML URL state based on page
 */
export type MlUrlGeneratorState = ExplorerUrlState;

export type ExplorerQueryState = QueryState & { ml: { jobIds: JobId[] } };

interface Params {
  appBasePath: string;
  useHash: boolean;
}

export class MlUrlGenerator implements UrlGeneratorsDefinition<typeof ML_APP_URL_GENERATOR> {
  constructor(private readonly params: Params) {}

  public readonly id = ML_APP_URL_GENERATOR;

  public readonly createUrl = async ({ page, ...params }: MlUrlGeneratorState): Promise<string> => {
    if (page === 'explorer') {
      return this.createExplorerUrl(params);
    }
    throw new Error('Page type is not provided or unknown');
  };

  /**
   * Creates URL to the Anomaly Explorer page
   */
  private createExplorerUrl({
    timeRange,
    jobIds,
    query,
    filters,
    refreshInterval,
    useHash = false,
    mlExplorerSwimlane = {},
  }: Omit<ExplorerUrlState, 'page'>): string {
    const appState: ExplorerAppState = {
      mlExplorerSwimlane,
      mlExplorerFilter: {},
    };

    const queryState: ExplorerQueryState = {
      ml: {
        jobIds,
      },
    };

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length)
      queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let url = `${this.params.appBasePath}#/explorer`;
    url = setStateToKbnUrl<QueryState>('_g', queryState, { useHash }, url);
    url = setStateToKbnUrl('_a', appState, { useHash }, url);

    return url;
  }
}
