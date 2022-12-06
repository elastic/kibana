/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCallOut } from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

import {
  SEARCH_QUERY_LANGUAGE,
  SearchQueryLanguage,
  SavedSearchSavedObject,
} from '../../application/utils/search_utils';
import { UrlStateProvider } from '../../hooks/use_url_state';
import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';

import { SpikeAnalysisTableRowStateProvider } from '../spike_analysis_table/spike_analysis_table_row_provider';

import { ExplainLogRateSpikesPage } from './explain_log_rate_spikes_page';

export interface ExplainLogRateSpikesAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
}

const defaultSearchQuery = {
  match_all: {},
};

export interface AiOpsIndexBasedAppState {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export const getDefaultAiOpsListState = (
  overrides?: Partial<AiOpsIndexBasedAppState>
): Required<AiOpsIndexBasedAppState> => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

export const restorableDefaults = getDefaultAiOpsListState();

export const ExplainLogRateSpikesAppState: FC<ExplainLogRateSpikesAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  if (!dataView) return null;

  if (!dataView.isTimeBased()) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" is not based on a time series.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="alert"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationDescription', {
            defaultMessage: 'Log rate spike analysis only runs over time-based indices.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <SpikeAnalysisTableRowStateProvider>
          <ExplainLogRateSpikesPage dataView={dataView} savedSearch={savedSearch} />
        </SpikeAnalysisTableRowStateProvider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
