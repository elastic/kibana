/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public';
import { TimeRange } from '../../../../src/plugins/data/public';
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
  mlExplorerFilter?: ExplorerAppState['mlExplorerFilter'];
}

/**
 * Union type of ML URL state based on page
 */
export type MlUrlGeneratorState = ExplorerUrlState;

export interface ExplorerQueryState {
  ml: { jobIds: JobId[] };
  time?: TimeRange;
}

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
    mlExplorerSwimlane = {},
    mlExplorerFilter = {},
  }: Omit<ExplorerUrlState, 'page'>): string {
    const appState: ExplorerAppState = {
      mlExplorerSwimlane,
      mlExplorerFilter,
    };

    const queryState: ExplorerQueryState = {
      ml: {
        jobIds,
      },
    };

    if (timeRange) queryState.time = timeRange;

    let url = `${this.params.appBasePath}#/explorer`;
    url = setStateToKbnUrl<ExplorerQueryState>('_g', queryState, { useHash: false }, url);
    url = setStateToKbnUrl('_a', appState, { useHash: false }, url);

    return url;
  }
}
